package com.mykyntus.dto.dossier;

import com.mykyntus.entity.EventType;
import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.FieldType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Life cycle ("road map") of a dossier.
 *
 * @param stages        steps of the process (import, sécurisation, planification, J, J+1) with their state and columns
 * @param edits         number of modifications: value changed or cleared after being set, or existing data changed by a new file
 * @param events        full history, oldest first
 * @param mails         every mail column of the dossier with its answer and its "Objet"
 * @param delay         DONE, ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red)
 * @param planification J-1 columns worked by the planification team
 * @param horsSecu      absent from the sécurisation files (sécurisation columns N/A)
 * @param assignees     who the dossier is dispatched to, per team (display names)
 */
public record DossierTimelineResponse(Long id, String idExterne, LocalDate date, LocalDateTime createdAt,
                                      LocalDateTime updatedAt, List<Stage> stages, int edits, List<Event> events,
                                      List<Mail> mails, String delay, boolean planification, boolean horsSecu,
                                      List<Assignee> assignees) {

    /** @param status DONE, CURRENT (last stage reached) or PENDING */
    public record Stage(String key, String label, String status, LocalDateTime at, String detail, List<StageField> fields) {
    }

    /**
     * One column of a stage.
     *
     * @param required must be filled for the dossier to be closed
     * @param by       display name of who filled it
     */
    public record StageField(Long id, String label, FieldType type, String value, boolean required, String by, LocalDateTime at) {
    }

    public record Event(Long id, EventType type, FieldSection section, String sectionLabel, String field,
                        String oldValue, String newValue, String detail, String actor, LocalDateTime at) {
    }

    /** A mail column (Mail / Teams, Mail...) with the "Objet" column that goes with it. */
    public record Mail(Long fieldId, String label, FieldSection section, String sectionLabel, String value, String objet,
                       String by, LocalDateTime at) {
    }

    public record Assignee(String team, String label, String name) {
    }
}
