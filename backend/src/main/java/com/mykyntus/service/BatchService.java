package com.mykyntus.service;

import com.mykyntus.dto.importing.BatchSummaryResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.*;
import com.mykyntus.security.CurrentUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Every imported file (admin's file and sécurisation files): history with the state of its dossiers,
 * and cancellation of a file injected by mistake.
 * <p>
 * Cancelling a file: the dossiers it created stay but become "Annulé" (grey, never late, never dispatched),
 * unless another kind of file also brought data to them (then only the file's columns are removed); the
 * values it replaced on existing dossiers are put back. A dossier also present in a later file of the same
 * kind is left as it is (the later file wins). Files imported before lines were recorded are found back
 * through their "Dossier créé par …" history.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BatchService {

    private static final int CHUNK = 1000;
    /** An import writes its history within this time after it started. */
    private static final int LEGACY_WINDOW_MINUTES = 30;

    private final ImportBatchRepository batchRepository;
    private final ImportRowRepository rowRepository;
    private final DossierRepository dossierRepository;
    private final DossierFieldValueRepository valueRepository;
    private final DossierEventRepository eventRepository;
    private final FlagService flagService;
    private final DossierProgressService progressService;

    @PersistenceContext
    private EntityManager em;

    // ------------------------------------------------------------------ history

    @Transactional(readOnly = true)
    public List<BatchSummaryResponse> list(CurrentUser user, int limit) {
        List<ImportBatch> batches = em.createQuery("select b from ImportBatch b order by b.importedAt desc, b.id desc", ImportBatch.class)
                .setMaxResults(Math.min(Math.max(limit, 1), 500))
                .getResultList();
        Map<Long, List<Long>> dossiers = dossiersOf(batches);
        return batches.stream().map(b -> {
            List<Long> ids = dossiers.getOrDefault(b.getId(), List.of());
            Stats s = stats(ids, DataSource.orMain(b.getSource()));
            DataSource source = DataSource.orMain(b.getSource());
            return new BatchSummaryResponse(b.getId(), b.getFileName(), source, b.getImportedBy(), b.getImportedAt(),
                    b.getTotalRows(), b.getCreatedRows(), b.getUpdatedRows(), b.getSkippedRows(),
                    b.isRolledBack(), b.getRolledBackAt(), b.getRolledBackBy(),
                    !b.isRolledBack() && user.role().canConfigure(source),
                    s.total, s.done, s.late, s.soon, s.onTime, s.unassigned, s.cancelled, s.first, s.last);
        }).toList();
    }

    private static final class Stats {
        long total;
        long done;
        long late;
        long soon;
        long onTime;
        long unassigned;
        long cancelled;
        LocalDate first;
        LocalDate last;
    }

    /** State of the dossiers of a file today. */
    private Stats stats(List<Long> ids, DataSource source) {
        Stats s = new Stats();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            List<Object[]> rows = em.createQuery("""
                    select d.dossierDate, d.complete, d.cancelled, d.assignedTo, d.assignedJ, count(d)
                    from Dossier d where d.id in :ids
                    group by d.dossierDate, d.complete, d.cancelled, d.assignedTo, d.assignedJ""", Object[].class)
                    .setParameter("ids", ids.subList(i, Math.min(i + CHUNK, ids.size())))
                    .getResultList();
            for (Object[] r : rows) {
                LocalDate date = (LocalDate) r[0];
                boolean complete = Boolean.TRUE.equals(r[1]);
                boolean cancelled = Boolean.TRUE.equals(r[2]);
                long n = ((Number) r[5]).longValue();
                s.total += n;
                if (date != null) {
                    s.first = s.first == null || date.isBefore(s.first) ? date : s.first;
                    s.last = s.last == null || date.isAfter(s.last) ? date : s.last;
                }
                if (cancelled) {
                    s.cancelled += n;
                    continue;
                }
                switch (DossierProgressService.delay(date, complete, now)) {
                    case DONE -> s.done += n;
                    case LATE -> s.late += n;
                    case SOON -> s.soon += n;
                    case ON_TIME, CANCELLED -> s.onTime += n;
                }
                String assignee = source == DataSource.MAIN ? (String) r[4] : (String) r[3];
                if (!complete && assignee == null) {
                    s.unassigned += n;
                }
            }
        }
        return s;
    }

    /** batch id -> dossiers of the file (recorded lines, or the history for older files). */
    private Map<Long, List<Long>> dossiersOf(List<ImportBatch> batches) {
        Map<Long, List<Long>> map = new HashMap<>();
        if (batches.isEmpty()) {
            return map;
        }
        for (Object[] r : em.createQuery("select r.batch.id, r.dossier.id from ImportRow r where r.batch.id in :ids", Object[].class)
                .setParameter("ids", batches.stream().map(ImportBatch::getId).toList()).getResultList()) {
            map.computeIfAbsent((Long) r[0], k -> new ArrayList<>()).add((Long) r[1]);
        }
        for (ImportBatch b : batches) {
            if (!map.containsKey(b.getId())) {
                map.put(b.getId(), legacyCreated(b));
            }
        }
        return map;
    }

    /**
     * Files imported before their lines were recorded: the dossiers they created, found through the
     * "Dossier créé par … « name »" history written by the same person right after the import started.
     */
    private List<Long> legacyCreated(ImportBatch b) {
        if (b.getImportedAt() == null) {
            return List.of();
        }
        return em.createQuery("""
                        select distinct e.dossier.id from DossierEvent e
                        where e.type = com.mykyntus.entity.EventType.CREATED and e.actor = :by
                          and e.at between :from and :to and e.detail like :name""", Long.class)
                .setParameter("by", b.getImportedBy())
                .setParameter("from", b.getImportedAt().minusMinutes(1))
                .setParameter("to", b.getImportedAt().plusMinutes(LEGACY_WINDOW_MINUTES))
                .setParameter("name", "%« " + b.getFileName() + " »%")
                .getResultList();
    }

    // ------------------------------------------------------------------ cancel

    /** What cancelling would do (shown before confirming). */
    @Transactional(readOnly = true)
    public BatchSummaryResponse.Preview preview(Long batchId, CurrentUser user) {
        ImportBatch batch = owned(batchId, user);
        Plan plan = plan(batch);
        return new BatchSummaryResponse.Preview(batch.getId(), batch.getFileName(), plan.cancelled().size(),
                plan.restored().size() + plan.stripped().size(), plan.kept(), plan.worked());
    }

    @Transactional
    public BatchSummaryResponse.Preview rollback(Long batchId, CurrentUser user) {
        ImportBatch batch = owned(batchId, user);
        Plan plan = plan(batch);
        int cancelled = apply(batch, plan, user.username());
        ImportBatch managed = batchRepository.findById(batch.getId()).orElseThrow();
        managed.setRolledBack(true);
        managed.setRolledBackAt(LocalDateTime.now());
        managed.setRolledBackBy(user.username());
        log.warn("Import {} ({}) cancelled by {}: {} dossier(s) cancelled, {} restored", batch.getFileName(), batch.getId(),
                user.username(), cancelled, plan.restored().size() + plan.stripped().size());
        return new BatchSummaryResponse.Preview(batch.getId(), batch.getFileName(), cancelled,
                plan.restored().size() + plan.stripped().size(), plan.kept(), plan.worked());
    }

    /**
     * Files cancelled before the "Annulé" state existed (older files had nothing recorded, so nothing
     * was undone): their dossiers get the "Annulé" state now. Runs at startup, only touches what is left.
     */
    @Transactional
    public int repairCancelled() {
        int fixed = 0;
        for (ImportBatch b : em.createQuery("select b from ImportBatch b where b.rolledBack = true order by b.id", ImportBatch.class).getResultList()) {
            if (!rowRepository.findByBatch(b.getId()).isEmpty()) {
                continue;
            }
            Plan plan = plan(b);
            List<Long> todo = plan.cancelled().stream().filter(id -> dossierRepository.findById(id).map(d -> !d.isCancelled()).orElse(false)).toList();
            if (!todo.isEmpty()) {
                fixed += apply(b, new Plan(todo, List.of(), List.of(), plan.kept(), plan.worked()), b.getRolledBackBy());
            }
        }
        if (fixed > 0) {
            log.info("{} dossier(s) of cancelled files set to \"Annulé\"", fixed);
        }
        return fixed;
    }

    private int apply(ImportBatch batch, Plan plan, String actor) {
        DataSource source = DataSource.orMain(batch.getSource());
        String detail = "Import « " + batch.getFileName() + " » annulé";
        List<Dossier> touched = new ArrayList<>();

        // 1. created by the file only: kept, marked "Annulé", out of the dispatch
        for (int i = 0; i < plan.cancelled().size(); i += CHUNK) {
            for (Dossier d : dossierRepository.findAllById(plan.cancelled().subList(i, Math.min(i + CHUNK, plan.cancelled().size())))) {
                d.setCancelled(true);
                d.setAssignedTo(null);
                d.setAssignedAt(null);
                d.setAssignedPlanif(null);
                d.setAssignedPlanifAt(null);
                d.setAssignedJ(null);
                d.setAssignedJAt(null);
                touched.add(d);
            }
        }
        // 2. created by the file but completed by another kind of file: only the file's columns go
        for (Dossier d : dossierRepository.findWithRawData(plan.stripped())) {
            d.getRawData().keySet().removeIf(k -> belongs(k, source));
            flagService.applyAutomatic(d);
            touched.add(d);
        }
        // 3. existing dossiers: the replaced values come back
        if (!plan.restored().isEmpty()) {
            Map<Long, ImportRow> rows = new HashMap<>();
            rowRepository.findByBatch(batch.getId()).forEach(r -> rows.put(r.getDossier().getId(), r));
            for (Dossier d : dossierRepository.findWithRawData(plan.restored())) {
                ImportRow row = rows.get(d.getId());
                row.decodePrevious().forEach((key, old) -> {
                    if (old == null) {
                        d.getRawData().remove(key);
                    } else {
                        d.getRawData().put(key, old);
                    }
                });
                if (row.getPreviousDate() != null) {
                    d.setDossierDate(row.getPreviousDate());
                }
                flagService.applyAutomatic(d);
                touched.add(d);
            }
        }
        List<DossierEvent> events = new ArrayList<>();
        for (Dossier d : touched) {
            d.setUpdatedAt(LocalDateTime.now());
            events.add(DossierEvent.builder().dossier(d).type(EventType.IMPORT_CANCELLED).detail(detail).actor(actor).build());
        }
        dossierRepository.saveAll(touched);
        eventRepository.saveAll(events);
        progressService.refresh(touched);
        return plan.cancelled().size();
    }

    /**
     * @param cancelled created by the file, no data from another kind of file (become "Annulé")
     * @param stripped  created by the file, but another kind of file brought data too
     * @param restored  existed before the file
     * @param kept      also in a later file of the same kind (left as is)
     * @param worked    cancelled dossiers on which a user already filled something
     */
    private record Plan(List<Long> cancelled, List<Long> stripped, List<Long> restored, long kept, long worked) {
    }

    private Plan plan(ImportBatch batch) {
        DataSource source = DataSource.orMain(batch.getSource());
        List<ImportRow> rows = rowRepository.findByBatch(batch.getId());
        record Line(Long id, boolean created) {
        }
        List<Line> lines = rows.isEmpty()
                ? legacyCreated(batch).stream().map(id -> new Line(id, true)).toList()
                : rows.stream().map(r -> new Line(r.getDossier().getId(), r.isCreated())).toList();

        Set<Long> later = new HashSet<>();
        List<Long> all = lines.stream().map(Line::id).toList();
        for (int i = 0; i < all.size(); i += CHUNK) {
            List<Long> part = all.subList(i, Math.min(i + CHUNK, all.size()));
            later.addAll(rowRepository.findDossiersInLaterBatches(part, batch.getId(), source));
            if (rows.isEmpty()) {
                // older files: a later import of the dossier (not cancelled) wins
                later.addAll(em.createQuery("""
                                select d.id from Dossier d where d.id in :ids and d.lastImport is not null and d.lastImport.id > :batchId
                                  and (d.lastImport.rolledBack is null or d.lastImport.rolledBack = false)""", Long.class)
                        .setParameter("ids", part).setParameter("batchId", batch.getId()).getResultList());
            }
        }
        List<Long> createdIds = lines.stream().filter(Line::created).map(Line::id).filter(id -> !later.contains(id)).toList();
        // data from another kind of file only counts if that kind still has a file that is not cancelled
        Set<DataSource> live = new HashSet<>(em.createQuery("""
                select distinct coalesce(b.source, com.mykyntus.entity.DataSource.MAIN) from ImportBatch b
                where b.rolledBack is null or b.rolledBack = false""", DataSource.class).getResultList());
        Map<Long, Boolean> otherData = new HashMap<>();
        for (int i = 0; i < createdIds.size(); i += CHUNK) {
            for (Dossier d : dossierRepository.findWithRawData(createdIds.subList(i, Math.min(i + CHUNK, createdIds.size())))) {
                otherData.put(d.getId(), d.getRawData().keySet().stream().map(BatchService::sourceOf)
                        .anyMatch(k -> k != source && live.contains(k)));
            }
        }
        List<Long> cancelled = new ArrayList<>();
        List<Long> stripped = new ArrayList<>();
        List<Long> restored = new ArrayList<>();
        long kept = 0;
        for (Line l : lines) {
            if (later.contains(l.id())) {
                kept++;
            } else if (!l.created()) {
                restored.add(l.id());
            } else if (Boolean.TRUE.equals(otherData.get(l.id()))) {
                stripped.add(l.id());
            } else if (otherData.containsKey(l.id())) {
                cancelled.add(l.id());
            }
        }
        long worked = 0;
        for (int i = 0; i < cancelled.size(); i += CHUNK) {
            worked += valueRepository.dossiersWithValues(cancelled.subList(i, Math.min(i + CHUNK, cancelled.size()))).size();
        }
        return new Plan(cancelled, stripped, restored, kept, worked);
    }

    /** Kind of file a raw key comes from ("S1::Statut" = file 1, no prefix = admin's file). */
    private static DataSource sourceOf(String key) {
        for (DataSource s : DataSource.values()) {
            if (s != DataSource.MAIN && key.startsWith(s.getPrefix())) {
                return s;
            }
        }
        return DataSource.MAIN;
    }

    /** Raw key brought by this kind of file ("S1::Statut" for file 1, no prefix for the admin's file). */
    private static boolean belongs(String key, DataSource source) {
        if (source != DataSource.MAIN) {
            return key.startsWith(source.getPrefix());
        }
        for (DataSource s : DataSource.values()) {
            if (s != DataSource.MAIN && key.startsWith(s.getPrefix())) {
                return false;
            }
        }
        return true;
    }

    private ImportBatch owned(Long batchId, CurrentUser user) {
        ImportBatch batch = batchRepository.findById(batchId).orElseThrow(() -> ApiException.notFound("Fichier introuvable"));
        if (!user.role().canConfigure(DataSource.orMain(batch.getSource()))) {
            throw ApiException.forbidden("Vous ne gérez pas ce type de fichier");
        }
        if (batch.isRolledBack()) {
            throw ApiException.badRequest("Cet import est déjà annulé");
        }
        return batch;
    }
}
