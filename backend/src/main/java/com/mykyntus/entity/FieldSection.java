package com.mykyntus.entity;

/**
 * Groups of application columns, in display order.
 * <p>
 * J-1 was merged into Sécurisation: it no longer holds columns, it only remains for the history
 * written before the merge. PLANIFICATION holds no column either: it is the section a J-1 column
 * (flagged {@code planification}) belongs to when its dossier is not "Planifié" (see {@link AppField}).
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
