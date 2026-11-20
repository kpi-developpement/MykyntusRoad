package com.mykyntus.dto.dossier;

import jakarta.validation.constraints.NotBlank;

/**
 * Distinct values of one column (with counts), computed with every other active filter
 * - same behaviour as an Excel auto-filter.
 *
 * @param criteria current table criteria
 * @param key      column key
 * @param q        optional search inside the values
 * @param limit    max number of values returned
 */
public record FacetRequest(DossierSearchRequest criteria, @NotBlank String key, String q, Integer limit) {

    public static final int DEFAULT_LIMIT = 300;
    public static final int MAX_LIMIT = 1000;

    public DossierSearchRequest criteriaOrEmpty() {
        return criteria == null ? DossierSearchRequest.empty() : criteria;
    }

    public int limitOrDefault() {
        return limit == null ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);
    }
}
