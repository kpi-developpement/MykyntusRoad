package com.mykyntus.repository.search;

import com.mykyntus.exception.ApiException;

/**
 * Identifies a column of the dossier table, as sent by the UI.
 * <ul>
 *   <li>{@code date} : dossier date</li>
 *   <li>{@code idExterne} : Ordre de travail: ID Externe</li>
 *   <li>{@code raw:<column name>} : a column of the imported files</li>
 *   <li>{@code field:<id>} : an application column (J-1 / J / J+1)</li>
 *   <li>{@code flags} : flags of the dossier (P1, SECU...)</li>
 *   <li>{@code assignee} : sécurisation pilots of the dossier (dispatched or joined),
 *       {@code assignee:J} : J-1 / J / J+1 pilots working on it</li>
 *   <li>{@code delay} : DONE (closed), ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red)</li>
 *   <li>{@code route} : PLANIFICATION (Cellule plani open, e.g. "Ouvert") or SECURISATION ("Planifié")</li>
 *   <li>{@code secu} : sécurisation still missing, J_MINUS_1 (appointment tomorrow) or J (today)</li>
 *   <li>{@code status:<SECTION>} : progress of a section (UNTOUCHED, IN_PROGRESS, DONE)</li>
 * </ul>
 */
public sealed interface ColumnKey {

    String DATE = "date";
    String ID_EXTERNE = "idExterne";
    String RAW_PREFIX = "raw:";
    String FIELD_PREFIX = "field:";
    String FLAGS = "flags";
    String ASSIGNEE = "assignee";
    String DELAY = "delay";
    String BATCH = "batch";
    String ROUTE = "route";
    String STATUS_PREFIX = "status:";
    String SECU = "secu";

    record DateKey() implements ColumnKey {
    }

    record IdKey() implements ColumnKey {
    }

    record RawKey(String column) implements ColumnKey {
    }

    record FieldKey(Long fieldId) implements ColumnKey {
    }

    record FlagsKey() implements ColumnKey {
    }

    record AssigneeKey(com.mykyntus.entity.Team team) implements ColumnKey {
    }

    /** Delay of the dossier (see DossierProgressService.Delay). */
    record DelayKey() implements ColumnKey {
    }

    /** Dossiers of imported files (values = file ids). */
    record BatchKey() implements ColumnKey {
    }

    /** Cellule plani: PLANIFICATION (open, conditional J-1 columns shown) or SECURISATION ("Planifié"). */
    record RouteKey() implements ColumnKey {
    }

    /** Sécurisation still missing the day before the appointment (J_MINUS_1) or on the day (J). */
    record SecuKey() implements ColumnKey {
    }

    /** Progress of the dossier in one section: nothing filled, started, or done. */
    record StatusKey(com.mykyntus.entity.FieldSection section) implements ColumnKey {
    }

    static ColumnKey parse(String key) {
        if (key == null || key.isBlank()) {
            throw ApiException.badRequest("Colonne manquante");
        }
        if (DATE.equals(key)) {
            return new DateKey();
        }
        if (ID_EXTERNE.equals(key)) {
            return new IdKey();
        }
        if (FLAGS.equals(key)) {
            return new FlagsKey();
        }
        if (ASSIGNEE.equals(key)) {
            return new AssigneeKey(com.mykyntus.entity.Team.SECURISATION);
        }
        if (key.startsWith(ASSIGNEE + ":")) {
            return new AssigneeKey(com.mykyntus.entity.Team.parse(key.substring(ASSIGNEE.length() + 1)));
        }
        if (BATCH.equals(key)) {
            return new BatchKey();
        }
        if (DELAY.equals(key)) {
            return new DelayKey();
        }
        if (ROUTE.equals(key)) {
            return new RouteKey();
        }
        if (SECU.equals(key)) {
            return new SecuKey();
        }
        if (key.startsWith(RAW_PREFIX) && key.length() > RAW_PREFIX.length()) {
            return new RawKey(key.substring(RAW_PREFIX.length()));
        }
        if (key.startsWith(STATUS_PREFIX)) {
            try {
                return new StatusKey(com.mykyntus.entity.FieldSection.valueOf(key.substring(STATUS_PREFIX.length())));
            } catch (IllegalArgumentException ignored) {
                // falls through to the error below
            }
        }
        if (key.startsWith(FIELD_PREFIX)) {
            try {
                return new FieldKey(Long.parseLong(key.substring(FIELD_PREFIX.length())));
            } catch (NumberFormatException ignored) {
                // falls through to the error below
            }
        }
        throw ApiException.badRequest("Colonne inconnue : " + key);
    }
}
