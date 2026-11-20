package com.mykyntus.repository.search;

import com.mykyntus.exception.ApiException;

import java.util.Locale;

/** Conditions of a column filter ("Filtres textuels" / "Filtres de date" in Excel). */
public enum FilterOp {
    CONTAINS(false),
    NOT_CONTAINS(true),
    EQUALS(false),
    NOT_EQUALS(true),
    STARTS_WITH(false),
    ENDS_WITH(false),
    EMPTY(true),
    NOT_EMPTY(false),
    BETWEEN(false);

    /**
     * Negative conditions are written "NOT (positive condition)", so a dossier without value matches them
     * ("ne contient pas X" includes the empty cells, like Excel).
     */
    private final boolean negative;

    FilterOp(boolean negative) {
        this.negative = negative;
    }

    public boolean negative() {
        return negative;
    }

    /** The positive condition of a negative one (NOT_CONTAINS -> CONTAINS, EMPTY -> NOT_EMPTY). */
    public FilterOp positive() {
        return switch (this) {
            case NOT_CONTAINS -> CONTAINS;
            case NOT_EQUALS -> EQUALS;
            case EMPTY -> NOT_EMPTY;
            default -> this;
        };
    }

    public boolean needsText() {
        return this != EMPTY && this != NOT_EMPTY && this != BETWEEN;
    }

    /** "notContains" / "not_contains" -> NOT_CONTAINS; null = CONTAINS. */
    public static FilterOp parse(String value) {
        if (value == null || value.isBlank()) {
            return CONTAINS;
        }
        String v = value.replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase(Locale.ROOT);
        try {
            return valueOf(v);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Condition de filtre inconnue : " + value);
        }
    }
}
