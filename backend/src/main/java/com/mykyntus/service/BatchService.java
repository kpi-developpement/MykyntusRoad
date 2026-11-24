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
 * Cancelling a file: the dossiers it created are removed (unless another kind of file also brought
 * data to them: then only its columns are removed), the values it replaced on existing dossiers are put
 * back. A dossier also present in a later file of the same kind is left as it is (the later file wins).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BatchService {

    private static final int CHUNK = 1000;

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
        Map<Long, long[]> stats = stats(batches.stream().map(ImportBatch::getId).toList());
        Map<Long, LocalDate[]> dates = dates(batches.stream().map(ImportBatch::getId).toList());
        return batches.stream().map(b -> {
            long[] s = stats.getOrDefault(b.getId(), new long[6]);
            LocalDate[] d = dates.getOrDefault(b.getId(), new LocalDate[2]);
            DataSource source = DataSource.orMain(b.getSource());
            return new BatchSummaryResponse(b.getId(), b.getFileName(), source, b.getImportedBy(), b.getImportedAt(),
                    b.getTotalRows(), b.getCreatedRows(), b.getUpdatedRows(), b.getSkippedRows(),
                    b.isRolledBack(), b.getRolledBackAt(), b.getRolledBackBy(),
                    !b.isRolledBack() && user.role().canConfigure(source),
                    s[0], s[1], s[2], s[3], s[4], s[5], d[0], d[1]);
        }).toList();
    }

    /** batch id -> [dossiers, done, late, soon, onTime, unassigned]. */
    private Map<Long, long[]> stats(List<Long> batchIds) {
        Map<Long, long[]> map = new HashMap<>();
        if (batchIds.isEmpty()) {
            return map;
        }
        LocalDateTime now = LocalDateTime.now();
        List<Object[]> rows = em.createQuery("""
                select r.batch.id, coalesce(r.batch.source, com.mykyntus.entity.DataSource.MAIN), d.dossierDate, d.complete,
                       d.assignedTo, d.assignedJ, count(d)
                from ImportRow r join r.dossier d
                where r.batch.id in :ids
                group by r.batch.id, coalesce(r.batch.source, com.mykyntus.entity.DataSource.MAIN), d.dossierDate, d.complete,
                         d.assignedTo, d.assignedJ""", Object[].class)
                .setParameter("ids", batchIds)
                .getResultList();
        for (Object[] r : rows) {
            long[] s = map.computeIfAbsent((Long) r[0], k -> new long[6]);
            DataSource source = (DataSource) r[1];
            LocalDate date = (LocalDate) r[2];
            boolean complete = Boolean.TRUE.equals(r[3]);
            long n = ((Number) r[6]).longValue();
            s[0] += n;
            switch (DossierProgressService.delay(date, complete, now)) {
                case DONE -> s[1] += n;
                case LATE -> s[2] += n;
                case SOON -> s[3] += n;
                case ON_TIME -> s[4] += n;
            }
            String assignee = source == DataSource.MAIN ? (String) r[5] : (String) r[4];
            if (!complete && assignee == null) {
                s[5] += n;
            }
        }
        return map;
    }

    private Map<Long, LocalDate[]> dates(List<Long> batchIds) {
        Map<Long, LocalDate[]> map = new HashMap<>();
        if (batchIds.isEmpty()) {
            return map;
        }
        for (Object[] r : em.createQuery("""
                select r.batch.id, min(r.dossier.dossierDate), max(r.dossier.dossierDate)
                from ImportRow r where r.batch.id in :ids group by r.batch.id""", Object[].class)
                .setParameter("ids", batchIds).getResultList()) {
            map.put((Long) r[0], new LocalDate[]{(LocalDate) r[1], (LocalDate) r[2]});
        }
        return map;
    }

    // ------------------------------------------------------------------ cancel

    /** What cancelling would do (shown before confirming). */
    @Transactional(readOnly = true)
    public BatchSummaryResponse.Preview preview(Long batchId, CurrentUser user) {
        ImportBatch batch = owned(batchId, user);
        Plan plan = plan(batch);
        return new BatchSummaryResponse.Preview(batch.getId(), batch.getFileName(), plan.deleted().size(),
                plan.restored().size() + plan.stripped().size(), plan.kept(), plan.worked());
    }

    @Transactional
    public BatchSummaryResponse.Preview rollback(Long batchId, CurrentUser user) {
        ImportBatch batch = owned(batchId, user);
        DataSource source = DataSource.orMain(batch.getSource());
        Plan plan = plan(batch);
        String detail = "Import « " + batch.getFileName() + " » annulé";

        // 1. dossiers created by the file and holding nothing else: removed with their history
        List<Long> deleted = plan.deleted();
        for (int i = 0; i < deleted.size(); i += CHUNK) {
            List<Long> ids = deleted.subList(i, Math.min(i + CHUNK, deleted.size()));
            rowRepository.deleteByDossierIds(ids);
            valueRepository.deleteByDossierIds(ids);
            eventRepository.deleteByDossierIds(ids);
            dossierRepository.deleteAllByIdInBatch(ids);
        }
        em.flush();
        em.clear();

        // 2. created by the file but completed by another kind of file: only the file's columns go
        List<Dossier> touched = new ArrayList<>();
        for (Dossier d : dossierRepository.findWithRawData(plan.stripped())) {
            d.getRawData().keySet().removeIf(k -> belongs(k, source));
            touched.add(d);
        }
        // 3. existing dossiers: the replaced values come back
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
            touched.add(d);
        }
        List<DossierEvent> events = new ArrayList<>();
        for (Dossier d : touched) {
            d.setUpdatedAt(LocalDateTime.now());
            flagService.applyAutomatic(d);
            events.add(DossierEvent.builder().dossier(d).type(EventType.IMPORT_CANCELLED).detail(detail).actor(user.username()).build());
        }
        dossierRepository.saveAll(touched);
        eventRepository.saveAll(events);
        progressService.refresh(touched);

        ImportBatch managed = batchRepository.findById(batch.getId()).orElseThrow();
        managed.setRolledBack(true);
        managed.setRolledBackAt(LocalDateTime.now());
        managed.setRolledBackBy(user.username());
        log.warn("Import {} ({}) cancelled by {}: {} removed, {} restored", batch.getFileName(), batch.getId(), user.username(),
                deleted.size(), touched.size());
        return new BatchSummaryResponse.Preview(batch.getId(), batch.getFileName(), deleted.size(), touched.size(), plan.kept(), plan.worked());
    }

    /**
     * @param deleted  created by the file, no data from another kind of file
     * @param stripped created by the file, but another kind of file brought data too
     * @param restored existed before the file
     * @param kept     also in a later file of the same kind (left as is)
     * @param worked   deleted dossiers on which a user already filled something
     */
    private record Plan(List<Long> deleted, List<Long> stripped, List<Long> restored, long kept, long worked) {
    }

    private Plan plan(ImportBatch batch) {
        DataSource source = DataSource.orMain(batch.getSource());
        List<ImportRow> rows = rowRepository.findByBatch(batch.getId());
        Set<Long> later = new HashSet<>();
        List<Long> all = rows.stream().map(r -> r.getDossier().getId()).toList();
        for (int i = 0; i < all.size(); i += CHUNK) {
            later.addAll(rowRepository.findDossiersInLaterBatches(all.subList(i, Math.min(i + CHUNK, all.size())), batch.getId(), source));
        }
        List<Long> deleted = new ArrayList<>();
        List<Long> stripped = new ArrayList<>();
        List<Long> restored = new ArrayList<>();
        Map<Long, Boolean> otherData = new HashMap<>();
        List<Long> createdIds = rows.stream().filter(ImportRow::isCreated).map(r -> r.getDossier().getId()).filter(id -> !later.contains(id)).toList();
        for (Dossier d : dossierRepository.findWithRawData(createdIds)) {
            otherData.put(d.getId(), d.getRawData().keySet().stream().anyMatch(k -> !belongs(k, source)));
        }
        long kept = 0;
        for (ImportRow r : rows) {
            Long id = r.getDossier().getId();
            if (later.contains(id)) {
                kept++;
            } else if (!r.isCreated()) {
                restored.add(id);
            } else if (Boolean.TRUE.equals(otherData.get(id))) {
                stripped.add(id);
            } else {
                deleted.add(id);
            }
        }
        long worked = 0;
        for (int i = 0; i < deleted.size(); i += CHUNK) {
            worked += valueRepository.dossiersWithValues(deleted.subList(i, Math.min(i + CHUNK, deleted.size()))).size();
        }
        return new Plan(deleted, stripped, restored, kept, worked);
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
