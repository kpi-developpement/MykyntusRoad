package com.mykyntus.dto.dossier;

import java.time.LocalDate;
import java.util.Map;

/**
 * One row of the main table.
 *
 * @param raw    imported columns: column name -> value
 * @param values application fields: field id -> selected value
 */
public record DossierRowResponse(Long id, String idExterne, LocalDate date,
                                 Map<String, String> raw, Map<Long, String> values) {
}
