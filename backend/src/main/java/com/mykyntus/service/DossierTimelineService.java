package com.mykyntus.service;

import com.mykyntus.dto.dossier.DossierTimelineResponse;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Event;
import com.mykyntus.dto.dossier.DossierTimelineResponse.Stage;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierFieldValueRepository;
import com.mykyntus.repository.DossierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** Builds the "road map" of a dossier: where it is in the process and everything that happened to it. */
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

    @Transactional(readOnly = true)
    public DossierTimelineResponse timeline(Long dossierId) {
        Dossier dossier = dossierRepository.findById(dossierId).orElseThrow(() -> ApiException.notFound("Dossier introuvable"));
        List<DossierEvent> events = eventRepository.findByDossierIdOrderByAtAscIdAsc(dossierId);
        Map<Long, String> values = valueRepository.findByDossierIds(List.of(dossierId)).stream()
                .collect(Collectors.toMap(v -> v.getField().getId(), DossierFieldValue::getValue));
        List<AppField> fields = fieldRepository.findAll().stream().filter(AppField::isActive).toList();

        List<Stage> stages = new ArrayList<>();
        String created = events.stream().filter(e -> e.getType() == EventType.CREATED).map(DossierEvent::getDetail).findFirst().orElse("Importé");
        stages.add(new Stage("IMPORT", "Import", DONE, dossier.getCreatedAt(), created));

        for (FieldSection section : FieldSection.values()) {
            List<AppField> sectionFields = fields.stream().filter(f -> f.getSection() == section).toList();
            if (sectionFields.isEmpty()) {
                continue;
            }
            long filled = sectionFields.stream().filter(f -> values.containsKey(f.getId())).count();
            LocalDateTime reachedAt = events.stream()
                    .filter(e -> e.getType() == EventType.VALUE_SET && e.getSection() == section)
                    .map(DossierEvent::getAt).findFirst().orElse(null);
            stages.add(new Stage(section.name(), section.getLabel(), filled > 0 ? DONE : PENDING, filled > 0 ? reachedAt : null,
                    stageDetail(sectionFields, values, filled)));
        }
        markCurrent(stages);

        int edits = (int) events.stream().filter(e -> switch (e.getType()) {
            case IMPORT_UPDATED, VALUE_CLEARED -> true;
            case VALUE_SET -> e.getOldValue() != null;
            case CREATED, DATA_RECEIVED -> false;
        }).count();

        List<Event> history = events.stream()
                .map(e -> new Event(e.getId(), e.getType(), e.getSection(), e.getSection() == null ? null : e.getSection().getLabel(),
                        e.getFieldLabel(), e.getOldValue(), e.getNewValue(), e.getDetail(), e.getActor(), e.getAt()))
                .toList();

        return new DossierTimelineResponse(dossier.getId(), dossier.getIdExterne(), dossier.getDossierDate(),
                dossier.getCreatedAt(), dossier.getUpdatedAt(), stages, edits, history);
    }

    /** Published values (ex: "Etat final : Sécurisé"), otherwise "2 / 5 champs". */
    private String stageDetail(List<AppField> fields, Map<Long, String> values, long filled) {
        String published = fields.stream()
                .filter(f -> f.isPublished() && values.containsKey(f.getId()))
                .map(f -> f.getLabel() + " : " + values.get(f.getId()))
                .collect(Collectors.joining(" · "));
        return published.isEmpty() ? filled + " / " + fields.size() + " champs" : published;
    }

    /** The last reached stage is the current one. */
    private void markCurrent(List<Stage> stages) {
        for (int i = stages.size() - 1; i >= 0; i--) {
            Stage s = stages.get(i);
            if (DONE.equals(s.status())) {
                stages.set(i, new Stage(s.key(), s.label(), CURRENT, s.at(), s.detail()));
                return;
            }
        }
    }
}
