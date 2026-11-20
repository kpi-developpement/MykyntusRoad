package com.mykyntus.entity;

/** Groups of application columns, in display order. */
public enum FieldSection {
    SECURISATION("Sécurisation"),
    J_MINUS_1("J-1"),
    J("J"),
    J_PLUS_1("J+1 à 12h00");

    private final String label;

    FieldSection(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
