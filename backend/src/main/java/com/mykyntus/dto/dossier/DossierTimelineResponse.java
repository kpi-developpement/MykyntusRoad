package com.mykyntus.dto.dossier;

import com.mykyntus.entity.EventType;
import com.mykyntus.entity.FieldSection;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Life cycle ("road map") of a dossier.
 *
 * @param stages steps of the process (import, sécurisation, J-1, J, J+1) with their state
 * @param edits  number of modifications: value changed or cleared after being set, or existing data changed by a new file
 * @param events full history, oldest first
 */
public record DossierTimelineResponse(Long id, String idExterne, LocalDate date, LocalDateTime createdAt,
                                      LocalDateTime updatedAt, List<Stage> stages, int edits, List<Event> events) {

    /** @param status DONE, CURRENT (last stage reached) or PENDING */
    public record Stage(String key, String label, String status, LocalDateTime at, String detail) {
    }

    public record Event(Long id, EventType type, FieldSection section, String sectionLabel, String field,
                        String oldValue, String newValue, String detail, String actor, LocalDateTime at) {
    }
}
