package com.mykyntus.dto.dossier;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * One row of the main table.
 *
 * @param raw           imported columns: column name -> value
 * @param values        application fields: field id -> selected value
 * @param flags         flag codes (P1, SECU...), in display order
 * @param flagsManual   true when the flags were changed by hand (no longer detected automatically)
 * @param assignedTo    lead sécurisation pilot (dispatch, username)
 * @param assignedJ     lead J-1 / J / J+1 pilot (first who took the dossier, username)
 * @param workers       team -> the other pilots who joined the lead (usernames, in joining order)
 * @param planification Cellule plani open (not "Planifié"): the conditional J-1 columns are shown
 * @param horsSecu      absent from the sécurisation files (sécurisation columns N/A)
 * @param delay         DONE, ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red)
 * @param secuAlert     sécurisation still missing: J_MINUS_1 (appointment tomorrow), J (today), null otherwise
 */
public record DossierRowResponse(Long id, String idExterne, LocalDate date,
                                 Map<String, String> raw, Map<Long, String> values,
                                 List<String> flags, boolean flagsManual, String assignedTo,
                                 String assignedJ, Map<String, List<String>> workers, boolean planification,
                                 boolean horsSecu, String delay, String secuAlert) {
}
