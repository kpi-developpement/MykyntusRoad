package com.mykyntus.dto.dossier;

import java.util.List;

/**
 * Filter on one column of the table.
 *
 * @param key    column key: {@code date}, {@code idExterne}, {@code flags}, {@code assignee}, {@code status:<SECTION>},
 *               {@code raw:<column name>} or {@code field:<id>}
 * @param values accepted values (an empty string means "(Vides)")
 * @param text   text of the condition (case insensitive)
 * @param op     condition: {@code contains} (default when a text is given), {@code notContains}, {@code equals},
 *               {@code notEquals}, {@code startsWith}, {@code endsWith}, {@code empty}, {@code notEmpty},
 *               {@code between} (dates, with {@code from} / {@code to})
 * @param from   first day (yyyy-MM-dd) of a {@code between} condition, null = no lower bound
 * @param to     last day (yyyy-MM-dd) of a {@code between} condition, null = no upper bound
 */
public record ColumnFilter(String key, List<String> values, String text, String op, String from, String to) {

    public ColumnFilter(String key, List<String> values, String text) {
        this(key, values, text, null, null, null);
    }
}
