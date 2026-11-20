package com.mykyntus.dto.dossier;

/**
 * @param key       column key (same format as {@link ColumnFilter#key()})
 * @param direction "asc" or "desc"
 */
public record SortSpec(String key, String direction) {

    public boolean descending() {
        return "desc".equalsIgnoreCase(direction);
    }
}
