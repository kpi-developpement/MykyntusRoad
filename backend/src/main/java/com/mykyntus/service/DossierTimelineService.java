package com.mykyntus.service;

import com.mykyntus.dto.dossier.DossierTimelineResponse;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Assignee;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Event;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Mail;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Stage;
import com.mykyntus.dto.dossier.DossierTimelineResponse.StageField;
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

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Builds the "road map" of a dossier: where it is in the process (Import → Sécurisation → Planification
 * when the dossier is not "Planifié" → J → J+1), the columns of every stage and everything that happened to it.
 */
@Service
@RequiredArgsConstructor
public class DossierTimelineService {

    private static final String DONE = "DONE";
    private static final String CURRENT = "CURRENT";
    private static final String PENDING = "PENDING";

    private final DossierRepository dossierRepository;
    private final DossierEventRepository eventRepository;
    private final DossierFieldValueRepository valueRepository;
    private final AppFieldRepository fieldRepository;
    private final AppUserRepository userRepository;

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
        Map<String, String> names = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUser::getUsername, PiloteService::displayName));

        List<Stage> stages = new ArrayList<>();
        String created = events.stream().filter(e -> e.getType() == EventType.CREATED).map(DossierEvent::getDetail).findFirst().orElse("Importé");
        stages.add(new Stage("IMPORT", "Import", DONE, dossier.getCreatedAt(), created, List.of()));

        boolean routed = dossier.isRoutedPlanif();
        // sécurisation (with the J-1 columns while the dossier is "Planifié") ; J-1 history before the merge counts here
        addStage(stages, FieldSection.SECURISATION, f -> f.getSection() == FieldSection.SECURISATION && !(routed && f.isPlanification()),
                Set.of(FieldSection.SECURISATION, FieldSection.J_MINUS_1), dossier, fields, values, valuesByCode, events, names);
        if (routed) {
            addStage(stages, FieldSection.PLANIFICATION, AppField::isPlanification, Set.of(FieldSection.PLANIFICATION),
                    dossier, fields, values, valuesByCode, events, names);
        }
        addStage(stages, FieldSection.J, f -> f.getSection() == FieldSection.J, Set.of(FieldSection.J),
                dossier, fields, values, valuesByCode, events, names);
        addStage(stages, FieldSection.J_PLUS_1, f -> f.getSection() == FieldSection.J_PLUS_1, Set.of(FieldSection.J_PLUS_1),
                dossier, fields, values, valuesByCode, events, names);
        markCurrent(stages);

        // the automatic N/A (cross-check with the sécurisation files) are not modifications
        int edits = (int) events.stream().filter(e -> !SecuCrossCheckService.ACTOR.equals(e.getActor())).filter(e -> switch (e.getType()) {
            case IMPORT_UPDATED, VALUE_CLEARED, FLAGS_CHANGED -> true;
            case VALUE_SET -> e.getOldValue() != null;
            case CREATED, DATA_RECEIVED, ASSIGNED -> false;
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

        return new DossierTimelineResponse(dossier.getId(), dossier.getIdExterne(), dossier.getDossierDate(),
                dossier.getCreatedAt(), dossier.getUpdatedAt(), stages, edits, history,
                mails(dossier, fields, values, names), DossierProgressService.delay(dossier).name(), routed,
                dossier.isHorsSecu(), assignees);
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
            String by = v == null || v.getUpdatedBy() == null ? null
                    : SecuCrossCheckService.SYSTEM.equals(v.getUpdatedBy()) ? "Système" : names.getOrDefault(v.getUpdatedBy(), v.getUpdatedBy());
            return new StageField(f.getId(), f.getLabel(), f.getType(), v == null ? null : v.getValue(),
                    DossierProgressService.applies(f, dossier, valuesByCode), by, v == null ? null : v.getUpdatedAt());
        }).toList();
        long filled = columns.stream().filter(c -> c.value() != null).count();
        LocalDateTime reachedAt = events.stream()
                .filter(e -> e.getType() == EventType.VALUE_SET && eventSections.contains(e.getSection()))
                .map(DossierEvent::getAt).findFirst().orElse(null);
        String detail;
        if (section == FieldSection.SECURISATION && dossier.isHorsSecu()) {
            detail = "Absent des fichiers sécurisation : N/A";
        } else {
            detail = stageDetail(stageFields, values, filled, columns.size());
        }
        stages.add(new Stage(section.name(), section.getLabel(), filled > 0 ? DONE : PENDING, filled > 0 ? reachedAt : null, detail, columns));
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
            if (DossierProgressService.isObjet(f) || !TextUtils.normalize(f.getLabel()).contains("mail")) {
                continue;
            }
            DossierFieldValue v = values.get(f.getId());
            AppField objetField = byCode.get(f.getCode() + DossierProgressService.OBJET_SUFFIX);
            DossierFieldValue objet = objetField == null ? null : values.get(objetField.getId());
            FieldSection section = DossierProgressService.effectiveSection(f, dossier);
            String by = v == null || v.getUpdatedBy() == null ? null : names.getOrDefault(v.getUpdatedBy(), v.getUpdatedBy());
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
