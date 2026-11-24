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
 * @param pin     optional: the dossiers of this pilot (in his team) come first
 */
public record DossierSearchRequest(LocalDate date, String search, List<ColumnFilter> filters, SortSpec sort,
                                   Integer page, Integer size, Pin pin) {

    /** "Mes dossiers en premier": username of the pilot and his team (SECURISATION, PLANIFICATION, J). */
    public record Pin(String team, String username) {
    }

    public DossierSearchRequest(LocalDate date, String search, List<ColumnFilter> filters, SortSpec sort,
                                Integer page, Integer size) {
        this(date, search, filters, sort, page, size, null);
    }

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
