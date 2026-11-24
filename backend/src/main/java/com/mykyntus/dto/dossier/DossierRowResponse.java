package com.mykyntus.dto.dossier;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * One row of the main table.
 *
 * @param raw         imported columns: column name -> value
 * @param values      application fields: field id -> selected value
 * @param flags       flag codes (P1, SECU...), in display order
 * @param flagsManual true when the flags were changed by hand (no longer detected automatically)
 * @param assignedTo  sécurisation pilot the dossier is dispatched to (username)
 * @param assignedPlanif planification agent (username)
 * @param assignedJ   J / J+1 agent (username)
 * @param planification J-1 columns worked by the planification team ("Cellule plani" not "Planifié")
 * @param horsSecu    absent from the sécurisation files (sécurisation columns N/A)
 * @param delay       DONE, ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red)
 */
public record DossierRowResponse(Long id, String idExterne, LocalDate date,
                                 Map<String, String> raw, Map<Long, String> values,
                                 List<String> flags, boolean flagsManual, String assignedTo,
                                 String assignedPlanif, String assignedJ, boolean planification,
                                 boolean horsSecu, String delay) {
}
