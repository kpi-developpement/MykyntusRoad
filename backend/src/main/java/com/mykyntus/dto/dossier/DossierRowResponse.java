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
 */
public record DossierRowResponse(Long id, String idExterne, LocalDate date,
                                 Map<String, String> raw, Map<Long, String> values,
                                 List<String> flags, boolean flagsManual, String assignedTo) {
}
