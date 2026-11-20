package com.mykyntus.dto.dossier;

import java.time.LocalDate;
import java.util.List;

/**
 * Criteria of the dossier table.
 *
 * @param date    dossier date (null = every date)
 * @param search  "ID Externe contains"
 * @param filters one filter per column
 * @param sort    optional sort, default: date then ID Externe
 */
public record DossierSearchRequest(LocalDate date, String search, List<ColumnFilter> filters, SortSpec sort,
                                   Integer page, Integer size) {

    public static final int DEFAULT_SIZE = 50;
    public static final int MAX_SIZE = 500;

    public List<ColumnFilter> filtersOrEmpty() {
        return filters == null ? List.of() : filters;
    }

    public int pageOrDefault() {
        return page == null ? 0 : Math.max(page, 0);
    }

    public int sizeOrDefault() {
        return size == null ? DEFAULT_SIZE : Math.min(Math.max(size, 1), MAX_SIZE);
    }

    public static DossierSearchRequest empty() {
        return new DossierSearchRequest(null, null, List.of(), null, 0, DEFAULT_SIZE);
    }
}
