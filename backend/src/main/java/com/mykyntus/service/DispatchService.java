package com.mykyntus.service;

import com.mykyntus.dto.dossier.DossierSearchRequest;
import com.mykyntus.dto.sec.*;
import com.mykyntus.entity.AppField;
import com.mykyntus.entity.AppUser;
import com.mykyntus.entity.DossierEvent;
import com.mykyntus.entity.EventType;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.repository.search.ColumnKey;
import com.mykyntus.repository.search.DossierSearchRepository;
import com.mykyntus.repository.search.DossierSearchRepository.ScopeRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Dispatch of the sécurisation work between the pilots.
 * <p>
 * Equitable on two levels: every pilot ends with the same number of dossiers to treat (± 1, current
 * loads included), and each kind of dossier (P1, P2, GEM, TH...) is spread evenly, so nobody gets all the
 * urgent ones. Dossiers already treated never move unless explicitly asked.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DispatchService {

    /** Priority of the flags: a dossier belongs to the first group it matches. */
    private static final List<String> PRIORITY = List.of("P1", "P2", "GEM", "TH", "RTI", "R1", "R2", "R3&+", "MIG", "GRE", "SECU");
    private static final int CHUNK = 1000;
    private static final String TREATED_FIELD = "sec_etat_final";

    private final DossierSearchRepository searchRepository;
    private final DossierRepository dossierRepository;
    private final DossierEventRepository eventRepository;
    private final AppFieldRepository fieldRepository;
    private final PiloteService piloteService;

    // ------------------------------------------------------------------ summary

    @Transactional(readOnly = true)
    public DispatchSummary summary(DossierSearchRequest criteria) {
        return summarize(scope(criteria));
    }

    // ------------------------------------------------------------------ dispatch

    @Transactional
    public DispatchResult dispatch(DispatchRequest request, String actor) {
        Map<String, AppUser> active = piloteService.activePilotes();
        List<String> pilotes = validPilotes(request.pilotes(), active);
        List<ScopeRow> scope = scope(request.criteria());

        Map<String, Integer> base = new LinkedHashMap<>();
        pilotes.forEach(p -> base.put(p, 0));
        List<ScopeRow> targets = new ArrayList<>();
        for (ScopeRow row : scope) {
            if (row.treated()) {
                continue;
            }
            boolean keep = request.onlyUnassigned() && row.assignedTo() != null && active.containsKey(row.assignedTo());
            if (keep) {
                // already with an active pilot: counts in his load if he is part of the dispatch
                base.computeIfPresent(row.assignedTo(), (k, v) -> v + 1);
            } else {
                targets.add(row);
            }
        }
        Map<String, List<Long>> plan = plan(targets, base, scope, pilotes);
        int moved = apply(plan, targets, active, actor, "dispatch");
        log.info("Dispatch by {}: {} dossiers between {} pilots", actor, moved, pilotes.size());
        return new DispatchResult(moved, summarize(scope(request.criteria())));
    }

    /** Manual change: these dossiers go to one pilot (or back to "not dispatched"). */
    @Transactional
    public DispatchResult assign(AssignRequest request, String actor) {
        if (request.dossierIds() == null || request.dossierIds().isEmpty()) {
            throw ApiException.badRequest("Aucun dossier sélectionné");
        }
        Map<String, AppUser> active = piloteService.activePilotes();
        String pilote = request.pilote() == null || request.pilote().isBlank() ? null : request.pilote().trim();
        if (pilote != null && !active.containsKey(pilote)) {
            throw ApiException.badRequest("Pilote inconnu ou désactivé : " + pilote);
        }
        Map<String, List<Long>> plan = new HashMap<>();
        plan.put(pilote, new ArrayList<>(new LinkedHashSet<>(request.dossierIds())));
        int moved = apply(plan, null, active, actor, "modification manuelle");
        return new DispatchResult(moved, null);
    }

    /** Moves (part of) the dossiers of a pilot to other pilots, spread equitably. */
    @Transactional
    public DispatchResult transfer(TransferRequest request, String actor) {
        Map<String, AppUser> active = piloteService.activePilotes();
        if (request.from() == null || request.from().isBlank()) {
            throw ApiException.badRequest("Pilote d'origine manquant");
        }
        List<String> to = validPilotes(request.to(), active).stream().filter(p -> !p.equals(request.from())).toList();
        if (to.isEmpty()) {
            throw ApiException.badRequest("Choisissez au moins un autre pilote");
        }
        List<ScopeRow> scope = scope(request.criteria());
        List<ScopeRow> owned = scope.stream()
                .filter(r -> request.from().equals(r.assignedTo()) && (request.includeTreated() || !r.treated()))
                .sorted(byPriority())
                .toList();
        int count = request.count() == null ? owned.size() : Math.max(0, Math.min(request.count(), owned.size()));
        List<ScopeRow> targets = evenSample(owned, count);

        Map<String, Integer> base = new LinkedHashMap<>();
        to.forEach(p -> base.put(p, 0));
        for (ScopeRow row : scope) {
            if (!row.treated() && row.assignedTo() != null) {
                base.computeIfPresent(row.assignedTo(), (k, v) -> v + 1);
            }
        }
        Map<String, List<Long>> plan = plan(targets, base, scope, to);
        int moved = apply(plan, targets, active, actor, "transfert depuis " + request.from());
        return new DispatchResult(moved, summarize(scope(request.criteria())));
    }

    /** Removes the pilot of the dossiers in scope. */
    @Transactional
    public DispatchResult unassign(UnassignRequest request, String actor) {
        List<ScopeRow> scope = scope(request.criteria());
        List<Long> ids = scope.stream()
                .filter(r -> r.assignedTo() != null)
                .filter(r -> request.pilote() == null || request.pilote().equals(r.assignedTo()))
                .filter(r -> request.includeTreated() || !r.treated())
                .map(ScopeRow::id)
                .toList();
        Map<String, List<Long>> plan = new HashMap<>();
        plan.put(null, ids);
        int moved = apply(plan, null, piloteService.activePilotes(), actor, "retrait du dispatch");
        return new DispatchResult(moved, summarize(scope(request.criteria())));
    }

    // ------------------------------------------------------------------ algorithm

    /**
     * Equal final loads (water filling on the current loads), then each dossier, by flag priority,
     * goes to the pilot with remaining room who has the fewest dossiers of that kind.
     */
    private Map<String, List<Long>> plan(List<ScopeRow> targets, Map<String, Integer> base, List<ScopeRow> scope, List<String> pilotes) {
        Map<String, List<Long>> plan = new LinkedHashMap<>();
        pilotes.forEach(p -> plan.put(p, new ArrayList<>()));
        if (targets.isEmpty()) {
            return plan;
        }
        // 1. room of each pilot: one dossier at a time to the least loaded
        Map<String, Integer> room = new HashMap<>();
        PriorityQueue<String> queue = new PriorityQueue<>(Comparator
                .comparingInt((String p) -> base.get(p) + room.getOrDefault(p, 0))
                .thenComparingInt(pilotes::indexOf));
        queue.addAll(pilotes);
        for (int i = 0; i < targets.size(); i++) {
            String p = queue.poll();
            room.merge(p, 1, Integer::sum);
            queue.add(p);
        }
        // 2. kind mix: the dossiers already held count too
        Map<String, Map<String, Integer>> kinds = new HashMap<>();
        Set<Long> moving = targets.stream().map(ScopeRow::id).collect(Collectors.toSet());
        for (ScopeRow row : scope) {
            if (row.assignedTo() != null && base.containsKey(row.assignedTo()) && !row.treated() && !moving.contains(row.id())) {
                kinds.computeIfAbsent(row.assignedTo(), k -> new HashMap<>()).merge(kind(row.flags()), 1, Integer::sum);
            }
        }
        List<ScopeRow> ordered = new ArrayList<>(targets);
        ordered.sort(byPriority());
        int turn = 0;
        for (ScopeRow row : ordered) {
            String kind = kind(row.flags());
            String best = null;
            for (int i = 0; i < pilotes.size(); i++) {
                String p = pilotes.get((turn + i) % pilotes.size());
                if (room.getOrDefault(p, 0) <= 0) {
                    continue;
                }
                if (best == null) {
                    best = p;
                    continue;
                }
                int a = kinds.getOrDefault(p, Map.of()).getOrDefault(kind, 0);
                int b = kinds.getOrDefault(best, Map.of()).getOrDefault(kind, 0);
                if (a < b || (a == b && room.get(p) > room.get(best))) {
                    best = p;
                }
            }
            plan.get(best).add(row.id());
            room.merge(best, -1, Integer::sum);
            kinds.computeIfAbsent(best, k -> new HashMap<>()).merge(kind, 1, Integer::sum);
            turn++;
        }
        return plan;
    }

    /** Writes the plan (bulk updates) and one life-cycle event per dossier whose pilot changed. */
    private int apply(Map<String, List<Long>> plan, List<ScopeRow> known, Map<String, AppUser> active, String actor, String how) {
        Map<Long, String> before = new HashMap<>();
        if (known != null) {
            known.forEach(r -> before.put(r.id(), r.assignedTo()));
        } else {
            List<Long> all = plan.values().stream().flatMap(List::stream).toList();
            for (int i = 0; i < all.size(); i += CHUNK) {
                dossierRepository.findAllById(all.subList(i, Math.min(i + CHUNK, all.size())))
                        .forEach(d -> before.put(d.getId(), d.getAssignedTo()));
            }
        }
        LocalDateTime now = LocalDateTime.now();
        int moved = 0;
        List<DossierEvent> events = new ArrayList<>();
        for (Map.Entry<String, List<Long>> entry : plan.entrySet()) {
            String pilote = entry.getKey();
            List<Long> ids = entry.getValue().stream()
                    .filter(id -> before.containsKey(id) && !Objects.equals(before.get(id), pilote))
                    .toList();
            for (int i = 0; i < ids.size(); i += CHUNK) {
                dossierRepository.assign(ids.subList(i, Math.min(i + CHUNK, ids.size())), pilote, pilote == null ? null : now);
            }
            for (Long id : ids) {
                String old = before.get(id);
                events.add(DossierEvent.builder()
                        .dossier(dossierRepository.getReferenceById(id))
                        .type(EventType.ASSIGNED)
                        .fieldLabel("Pilote assigné")
                        .oldValue(old == null ? null : name(old, active))
                        .newValue(pilote == null ? null : name(pilote, active))
                        .detail(pilote == null ? "Retiré du dispatch (" + how + ")" : "Attribué à " + name(pilote, active) + " (" + how + ")")
                        .actor(actor)
                        .build());
            }
            moved += ids.size();
        }
        for (int i = 0; i < events.size(); i += CHUNK) {
            eventRepository.saveAll(events.subList(i, Math.min(i + CHUNK, events.size())));
        }
        return moved;
    }

    // ------------------------------------------------------------------ helpers

    private List<ScopeRow> scope(DossierSearchRequest criteria) {
        DossierSearchRequest c = criteria == null ? DossierSearchRequest.empty() : criteria;
        c.filtersOrEmpty().stream().filter(Objects::nonNull).forEach(f -> ColumnKey.parse(f.key()));
        Long treatedField = fieldRepository.findAll().stream()
                .filter(f -> TREATED_FIELD.equals(f.getCode()) && f.isActive())
                .map(AppField::getId).findFirst().orElse(null);
        return searchRepository.scope(c, treatedField);
    }

    private DispatchSummary summarize(List<ScopeRow> scope) {
        Map<String, AppUser> all = piloteService.allPilotes().stream()
                .collect(Collectors.toMap(AppUser::getUsername, u -> u));
        Map<String, long[]> counts = new LinkedHashMap<>();
        Map<String, Map<String, Long>> flags = new HashMap<>();
        Map<String, Long> unassignedFlags = new TreeMap<>(Comparator.comparingInt(DispatchService::rank).thenComparing(c -> c));
        long treated = 0;
        long unassigned = 0;
        for (ScopeRow row : scope) {
            if (row.treated()) {
                treated++;
            }
            if (row.assignedTo() == null) {
                unassigned++;
                FlagService.decode(row.flags()).forEach(f -> unassignedFlags.merge(f, 1L, Long::sum));
                continue;
            }
            long[] c = counts.computeIfAbsent(row.assignedTo(), k -> new long[2]);
            c[0]++;
            if (row.treated()) {
                c[1]++;
            }
            Map<String, Long> f = flags.computeIfAbsent(row.assignedTo(), k -> new TreeMap<>(Comparator.comparingInt(DispatchService::rank).thenComparing(x -> x)));
            FlagService.decode(row.flags()).forEach(code -> f.merge(code, 1L, Long::sum));
        }
        // every active pilot is listed, even without dossier
        all.values().stream().filter(AppUser::isActive).forEach(u -> counts.putIfAbsent(u.getUsername(), new long[2]));

        List<DispatchSummary.PiloteLoad> loads = counts.entrySet().stream()
                .map(e -> {
                    AppUser u = all.get(e.getKey());
                    return new DispatchSummary.PiloteLoad(e.getKey(), u == null ? null : u.getFullName(),
                            u != null && u.isActive(), e.getValue()[0], e.getValue()[1], flags.getOrDefault(e.getKey(), Map.of()));
                })
                .sorted(Comparator.comparing((DispatchSummary.PiloteLoad l) -> !l.active())
                        .thenComparing(l -> (l.fullName() != null ? l.fullName() : l.username()).toLowerCase()))
                .toList();
        return new DispatchSummary(scope.size(), treated, unassigned, unassignedFlags, loads);
    }

    private static List<String> validPilotes(List<String> requested, Map<String, AppUser> active) {
        List<String> pilotes = requested == null ? List.of()
                : requested.stream().filter(Objects::nonNull).map(String::trim).distinct().toList();
        if (pilotes.isEmpty()) {
            throw ApiException.badRequest("Sélectionnez au moins un pilote");
        }
        for (String p : pilotes) {
            if (!active.containsKey(p)) {
                throw ApiException.badRequest("Pilote inconnu ou désactivé : " + p);
            }
        }
        return pilotes;
    }

    /** First flag of the dossier in priority order ("" = no flag). */
    private static String kind(String flags) {
        List<String> codes = FlagService.decode(flags);
        for (String p : PRIORITY) {
            if (codes.contains(p)) {
                return p;
            }
        }
        return codes.isEmpty() ? "" : codes.getFirst();
    }

    private static int rank(String code) {
        int i = PRIORITY.indexOf(code);
        return i < 0 ? PRIORITY.size() : i;
    }

    private static Comparator<ScopeRow> byPriority() {
        return Comparator.comparingInt((ScopeRow r) -> {
            String k = kind(r.flags());
            return k.isEmpty() ? PRIORITY.size() + 1 : rank(k);
        }).thenComparing(ScopeRow::id);
    }

    /** {@code count} rows spread over the whole (priority sorted) list, so the moved part keeps the same mix. */
    private static List<ScopeRow> evenSample(List<ScopeRow> rows, int count) {
        if (count >= rows.size()) {
            return rows;
        }
        List<ScopeRow> result = new ArrayList<>(count);
        double step = (double) rows.size() / count;
        for (int i = 0; i < count; i++) {
            result.add(rows.get((int) Math.floor(i * step)));
        }
        return result;
    }

    private static String name(String username, Map<String, AppUser> users) {
        AppUser u = users.get(username);
        return u == null ? username : PiloteService.displayName(u);
    }
}
