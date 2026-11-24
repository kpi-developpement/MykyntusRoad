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
 *   <li>{@code assignee} : sécurisation pilot the dossier is dispatched to,
 *       {@code assignee:PLANIFICATION} / {@code assignee:J} : agent of the other teams</li>
 *   <li>{@code delay} : DONE (closed), ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red)</li>
 *   <li>{@code route} : PLANIFICATION (J-1 columns with the planification team) or SECURISATION</li>
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
    String ROUTE = "route";
    String STATUS_PREFIX = "status:";

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

    /** Team working the J-1 columns: PLANIFICATION or SECURISATION. */
    record RouteKey() implements ColumnKey {
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
        if (DELAY.equals(key)) {
            return new DelayKey();
        }
        if (ROUTE.equals(key)) {
            return new RouteKey();
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
