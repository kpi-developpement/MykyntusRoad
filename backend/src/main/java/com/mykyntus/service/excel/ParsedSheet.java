package com.mykyntus.service.excel;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Result of reading a file.
 *
 * @param headers  column names in file order
 * @param rows     every data row
 * @param warnings non blocking problems found while reading
 * @param idHeader header of the identifier column
 */
public record ParsedSheet(List<String> headers, List<ParsedRow> rows, List<String> warnings, String idHeader) {

    /**
     * @param lineNumber Excel line number (1-based), used in warnings
     * @param idExterne  value of "Ordre de travail: ID Externe"
     * @param date       date of the dossier detected in the row (may be null)
     * @param values     column name -> formatted value
     */
    public record ParsedRow(int lineNumber, String idExterne, LocalDate date, Map<String, String> values) {
    }
}
