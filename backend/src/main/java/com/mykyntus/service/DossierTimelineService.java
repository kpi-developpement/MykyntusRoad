package com.mykyntus.service;

import com.mykyntus.dto.dossier.DossierTimelineResponse;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Assignee;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Contributor;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Event;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Mail;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Stage;
import com.mykyntus.dto.dossier.DossierTimelineResponse.StageField;
import com.mykyntus.dto.worker.WorkerResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.AppUserRepository;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierFieldValueRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Builds the "road map" of a dossier: where it is in the process (Import → Sécurisation → J-1 → J → J+1),
 * the columns of every stage, who works on it and everything that happened to it.
 */
@Service
@RequiredArgsConstructor
public class DossierTimelineService {

    private static final String DONE = "DONE";
    private static final String CURRENT = "CURRENT";
    private static final String PENDING = "PENDING";
    /** Shown as the author of the values written at import. */
    private static final String AUTO_LABEL = "Automatique (import)";

    private final DossierRepository dossierRepository;
    private final DossierEventRepository eventRepository;
    private final DossierFieldValueRepository valueRepository;
    private final AppFieldRepository fieldRepository;
    private final AppUserRepository userRepository;
    private final WorkerService workerService;

    @Transactional(readOnly = true)
    public DossierTimelineResponse timeline(Long dossierId) {
        Dossier dossier = dossierRepository.findById(dossierId).orElseThrow(() -> ApiException.notFound("Dossier introuvable"));
        List<DossierEvent> events = eventRepository.findByDossierIdOrderByAtAscIdAsc(dossierId);
        Map<Long, DossierFieldValue> values = valueRepository.findByDossierIds(List.of(dossierId)).stream()
                .collect(Collectors.toMap(v -> v.getField().getId(), v -> v));
        Map<String, String> valuesByCode = values.values().stream()
                .collect(Collectors.toMap(v -> v.getField().getCode(), DossierFieldValue::getValue, (a, b) -> a));
        List<AppField> fields = fieldRepository.findAll().stream()
                .filter(AppField::isActive)
                .sorted(AppFieldService.DISPLAY_ORDER)
                .toList();
        List<AppUser> users = userRepository.findAll();
        Map<String, String> names = users.stream().collect(Collectors.toMap(AppUser::getUsername, PiloteService::displayName));

        List<Stage> stages = new ArrayList<>();
        String created = events.stream().filter(e -> e.getType() == EventType.CREATED).map(DossierEvent::getDetail).findFirst().orElse("Importé");
        stages.add(new Stage("IMPORT", "Import", DONE, dossier.getCreatedAt(), created, List.of()));

        boolean open = dossier.isRoutedPlanif();
        addStage(stages, FieldSection.SECURISATION, f -> f.getSection() == FieldSection.SECURISATION,
                Set.of(FieldSection.SECURISATION), dossier, fields, values, valuesByCode, events, names);
        // J-1: Cellule plani, and the conditional columns once it is open (history of the former planification team included)
        addStage(stages, FieldSection.J_MINUS_1, f -> f.getSection() == FieldSection.J_MINUS_1 && DossierProgressService.available(f, dossier),
                Set.of(FieldSection.J_MINUS_1, FieldSection.PLANIFICATION), dossier, fields, values, valuesByCode, events, names);
        addStage(stages, FieldSection.J, f -> f.getSection() == FieldSection.J, Set.of(FieldSection.J),
                dossier, fields, values, valuesByCode, events, names);
        addStage(stages, FieldSection.J_PLUS_1, f -> f.getSection() == FieldSection.J_PLUS_1, Set.of(FieldSection.J_PLUS_1),
                dossier, fields, values, valuesByCode, events, names);
        markCurrent(stages);

        // the automatic N/A (cross-check with the sécurisation files) are not modifications
        int edits = (int) events.stream().filter(e -> !SecuCrossCheckService.ACTOR.equals(e.getActor())).filter(e -> switch (e.getType()) {
            case IMPORT_UPDATED, VALUE_CLEARED, FLAGS_CHANGED, IMPORT_CANCELLED -> true;
            case VALUE_SET -> e.getOldValue() != null && !DossierValueService.DEFAULT_REPLACED.equals(e.getDetail());
            case CREATED, DATA_RECEIVED, ASSIGNED, JOINED, LEFT -> false;
        }).count();

        List<Event> history = events.stream()
                .map(e -> new Event(e.getId(), e.getType(), e.getSection(), e.getSection() == null ? null : e.getSection().getLabel(),
                        e.getFieldLabel(), e.getOldValue(), e.getNewValue(), e.getDetail(), e.getActor(), e.getAt()))
                .toList();

        List<Assignee> assignees = new ArrayList<>();
        for (Team team : Team.values()) {
            String username = team.assignee(dossier);
            if (username != null) {
                assignees.add(new Assignee(team.name(), team.label(), names.getOrDefault(username, username)));
            }
        }

        AppField etatFinal = fields.stream().filter(f -> DossierProgressService.ETAT_FINAL.equals(f.getCode())).findFirst().orElse(null);
        String secuAlert = etatFinal == null ? null
                : DossierProgressService.secuAlert(dossier, valuesByCode.get(etatFinal.getCode()), LocalDate.now());

        return new DossierTimelineResponse(dossier.getId(), dossier.getIdExterne(), dossier.getDossierDate(),
                dossier.getCreatedAt(), dossier.getUpdatedAt(), stages, edits, history,
                mails(dossier, fields, values, names), DossierProgressService.delay(dossier).name(), open,
                dossier.isHorsSecu(), assignees, contributors(dossier, events, users, names), secuAlert);
    }

    /**
     * The pilots on the dossier (lead first, then the ones who joined) and everyone else who changed
     * something, each with the number of changes and the last one.
     */
    private List<Contributor> contributors(Dossier dossier, List<DossierEvent> events, List<AppUser> users, Map<String, String> names) {
        // events store the display name (values) or the username (flags, dispatch): both lead to the account
        Map<String, String> usernameOf = new HashMap<>();
        for (AppUser u : users) {
            usernameOf.put(u.getUsername(), u.getUsername());
            usernameOf.putIfAbsent(PiloteService.displayName(u), u.getUsername());
        }
        Map<String, int[]> counts = new HashMap<>();
        Map<String, DossierEvent> last = new HashMap<>();
        for (DossierEvent e : events) {
            boolean action = e.getType() == EventType.VALUE_SET || e.getType() == EventType.VALUE_CLEARED || e.getType() == EventType.FLAGS_CHANGED;
            String username = e.getActor() == null ? null : usernameOf.get(e.getActor());
            if (!action || username == null) {
                continue;
            }
            counts.computeIfAbsent(username, k -> new int[1])[0]++;
            last.put(username, e);
        }
        Map<String, Contributor> result = new LinkedHashMap<>();
        Set<String> joinedOnce = events.stream().filter(e -> e.getType() == EventType.JOINED)
                .map(e -> usernameOf.get(e.getActor())).filter(Objects::nonNull).collect(Collectors.toSet());
        for (WorkerResponse w : workerService.all(dossier, new HashMap<>(names))) {
            if (result.containsKey(w.username())) {
                continue;
            }
            Team team = Team.valueOf(w.team());
            result.put(w.username(), contributor(w.username(), names, team, w.lead(), true, w.joinedAt(), counts, last));
        }
        // gone from the dossier, or only changed values (admins...)
        Set<String> others = new LinkedHashSet<>(joinedOnce);
        others.addAll(counts.keySet());
        for (String username : others) {
            if (!result.containsKey(username)) {
                LocalDateTime joinedAt = events.stream()
                        .filter(e -> e.getType() == EventType.JOINED && username.equals(usernameOf.get(e.getActor())))
                        .map(DossierEvent::getAt).findFirst().orElse(null);
                result.put(username, contributor(username, names, null, false, false, joinedAt, counts, last));
            }
        }
        return new ArrayList<>(result.values());
    }

    private static Contributor contributor(String username, Map<String, String> names, Team team, boolean lead, boolean active,
                                           LocalDateTime joinedAt, Map<String, int[]> counts, Map<String, DossierEvent> last) {
        DossierEvent e = last.get(username);
        String lastAction = null;
        if (e != null) {
            String field = e.getFieldLabel() == null ? "" : e.getFieldLabel();
            lastAction = e.getType() == EventType.VALUE_CLEARED ? field + " effacé"
                    : field + (e.getNewValue() == null ? "" : " → " + e.getNewValue());
        }
        return new Contributor(username, names.getOrDefault(username, username), team == null ? null : team.name(),
                team == null ? null : team.label(), lead, active, joinedAt,
                counts.containsKey(username) ? counts.get(username)[0] : 0, e == null ? null : e.getAt(), lastAction);
    }

    private void addStage(List<Stage> stages, FieldSection section, Predicate<AppField> belongs, Set<FieldSection> eventSections,
                          Dossier dossier, List<AppField> fields, Map<Long, DossierFieldValue> values,
                          Map<String, String> valuesByCode, List<DossierEvent> events, Map<String, String> names) {
        List<AppField> stageFields = fields.stream().filter(belongs).filter(f -> f.getType() != FieldType.USER).toList();
        if (stageFields.isEmpty()) {
            return;
        }
        List<StageField> columns = stageFields.stream().map(f -> {
            DossierFieldValue v = values.get(f.getId());
            String by = v == null || v.getUpdatedBy() == null ? null : by(v.getUpdatedBy(), names);
            return new StageField(f.getId(), f.getLabel(), f.getType(), v == null ? null : v.getValue(),
                    DossierProgressService.applies(f, dossier, valuesByCode), by, v == null ? null : v.getUpdatedAt());
        }).toList();
        // the values written at import (date de traitement, Cellule plani "Planifié") do not start a stage
        long filled = stageFields.stream()
                .map(f -> values.get(f.getId()))
                .filter(v -> v != null && v.getValue() != null && !DossierProgressService.DEFAULT_ACTOR.equals(v.getUpdatedBy()))
                .count();
        LocalDateTime reachedAt = events.stream()
                .filter(e -> e.getType() == EventType.VALUE_SET && eventSections.contains(e.getSection()))
                .map(DossierEvent::getAt).findFirst().orElse(null);
        String detail;
        if (section == FieldSection.SECURISATION && dossier.isHorsSecu()) {
            detail = "Absent des fichiers sécurisation : N/A";
        } else if (section == FieldSection.J_MINUS_1) {
            long open = stageFields.stream().filter(DossierProgressService::isConditional).count();
            long openFilled = stageFields.stream().filter(DossierProgressService::isConditional)
                    .filter(f -> values.get(f.getId()) != null).count();
            detail = dossier.isRoutedPlanif()
                    ? "Cellule plani ouverte · " + openFilled + " / " + open + " champs"
                    : "Planifié · colonnes J-1 fermées";
        } else {
            // the automatic columns (date de traitement...) are not part of the work
            detail = stageDetail(stageFields, values, filled, (int) stageFields.stream().filter(f -> !DossierProgressService.isAuto(f)).count());
        }
        stages.add(new Stage(section.name(), section.getLabel(), filled > 0 ? DONE : PENDING, filled > 0 ? reachedAt : null, detail, columns));
    }

    private static String by(String updatedBy, Map<String, String> names) {
        if (SecuCrossCheckService.SYSTEM.equals(updatedBy)) {
            return "Système";
        }
        if (DossierProgressService.DEFAULT_ACTOR.equals(updatedBy)) {
            return AUTO_LABEL;
        }
        return names.getOrDefault(updatedBy, updatedBy);
    }

    /** Published values (ex: "Etat final : Sécurisé"), otherwise "2 / 5 champs". */
    private String stageDetail(List<AppField> fields, Map<Long, DossierFieldValue> values, long filled, int total) {
        String published = fields.stream()
                .filter(f -> f.isPublished() && values.containsKey(f.getId()))
                .map(f -> f.getLabel() + " : " + values.get(f.getId()).getValue())
                .collect(Collectors.joining(" · "));
        return published.isEmpty() ? filled + " / " + total + " champs" : published;
    }

    /** Every mail column (label containing "mail", not an "Objet") with its answer and its objet. */
    private List<Mail> mails(Dossier dossier, List<AppField> fields, Map<Long, DossierFieldValue> values, Map<String, String> names) {
        Map<String, AppField> byCode = fields.stream().collect(Collectors.toMap(AppField::getCode, f -> f));
        List<Mail> list = new ArrayList<>();
        for (AppField f : fields) {
            if (DossierProgressService.isObjet(f) || !TextUtils.normalize(f.getLabel()).contains("mail")
                    || !DossierProgressService.available(f, dossier)) {
                continue;
            }
            DossierFieldValue v = values.get(f.getId());
            AppField objetField = byCode.get(f.getCode() + DossierProgressService.OBJET_SUFFIX);
            DossierFieldValue objet = objetField == null ? null : values.get(objetField.getId());
            FieldSection section = f.getSection();
            String by = v == null || v.getUpdatedBy() == null ? null : by(v.getUpdatedBy(), names);
            list.add(new Mail(f.getId(), f.getLabel(), section, section.getLabel(), v == null ? null : v.getValue(),
                    objet == null ? null : objet.getValue(), by, v == null ? null : v.getUpdatedAt()));
        }
        return list;
    }

    /** The last reached stage is the current one. */
    private void markCurrent(List<Stage> stages) {
        for (int i = stages.size() - 1; i >= 0; i--) {
            Stage s = stages.get(i);
            if (DONE.equals(s.status())) {
                stages.set(i, new Stage(s.key(), s.label(), CURRENT, s.at(), s.detail(), s.fields()));
                return;
            }
        }
    }
}
