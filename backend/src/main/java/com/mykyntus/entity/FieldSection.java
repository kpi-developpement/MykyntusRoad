package com.mykyntus.entity;

/**
 * Groups of application columns, in display order.
 * <p>
 * SECURISATION: work of the sécurisation team (up to "Etat final"). J_MINUS_1: "Cellule plani" and the
 * columns that open when it is not "Planifié", worked by the admin and the J pilots. PLANIFICATION holds
 * no column: it only remains for the history written while a planification team existed.
 */
public enum FieldSection {
    SECURISATION("Sécurisation"),
    J_MINUS_1("J-1"),
    PLANIFICATION("Planification"),
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
