package com.mykyntus.dto.dossier;

import java.util.List;

/**
 * Filter on one column of the table.
 *
 * @param key    column key: {@code date}, {@code idExterne}, {@code raw:<column name>} or {@code field:<id>}
 * @param values accepted values (an empty string means "(Vides)")
 * @param text   "contains" filter, case insensitive
 */
public record ColumnFilter(String key, List<String> values, String text) {
}
