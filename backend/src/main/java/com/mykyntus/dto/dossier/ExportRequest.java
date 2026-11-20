package com.mykyntus.dto.dossier;

import java.util.List;

/**
 * Excel export of the table.
 *
 * @param criteria same criteria as the table (paging ignored)
 * @param columns  columns to write, in order (empty = date, ID externe, flags, pilot and every visible column)
 */
public record ExportRequest(DossierSearchRequest criteria, List<Column> columns) {

    public record Column(String key, String label) {
    }
}
