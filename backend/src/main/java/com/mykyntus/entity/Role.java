package com.mykyntus.entity;

import java.util.Set;

/**
 * Application roles.
 * <ul>
 *   <li>ADMIN : main import, J / J+1 columns, planification (dispatch to the planification and J agents), users.</li>
 *   <li>ADMIN_SECURISATION : the sécurisation files, columns and dispatch of the sécurisation pilots.</li>
 *   <li>PILOTE_SECURISATION : works the day before (Sécurisation section, J-1 columns of "Planifié" dossiers).</li>
 *   <li>PILOTE_PLANIFICATION : J-1 columns of the dossiers that are not "Planifié".</li>
 *   <li>PILOTE_J : agent working the J and J+1 sections.</li>
 * </ul>
 * Pilots only edit the dossiers dispatched to them (see {@link Team}).
 */
public enum Role {
    ADMIN(Set.of(FieldSection.PLANIFICATION, FieldSection.J, FieldSection.J_PLUS_1)),
    ADMIN_SECURISATION(Set.of(FieldSection.SECURISATION)),
    PILOTE_SECURISATION(Set.of(FieldSection.SECURISATION)),
    PILOTE_PLANIFICATION(Set.of(FieldSection.PLANIFICATION)),
    PILOTE_J(Set.of(FieldSection.J, FieldSection.J_PLUS_1));

    private final Set<FieldSection> editableSections;

    Role(Set<FieldSection> editableSections) {
        this.editableSections = editableSections;
    }

    public boolean canEdit(FieldSection section) {
        return editableSections.contains(section);
    }

    public Set<FieldSection> getEditableSections() {
        return editableSections;
    }

    /** Team of a pilot (null for the admins): a pilot only edits the dossiers dispatched to him. */
    public Team team() {
        return switch (this) {
            case PILOTE_SECURISATION -> Team.SECURISATION;
            case PILOTE_PLANIFICATION -> Team.PLANIFICATION;
            case PILOTE_J -> Team.J;
            default -> null;
        };
    }

    /** Sections whose columns (and dropdown values) this role administrates. */
    public boolean canConfigure(FieldSection section) {
        return switch (this) {
            case ADMIN -> section == FieldSection.J || section == FieldSection.J_PLUS_1;
            case ADMIN_SECURISATION -> section == FieldSection.SECURISATION;
            default -> false;
        };
    }

    /** Imported sources whose columns this role can show / hide. */
    public boolean canConfigure(DataSource source) {
        return switch (this) {
            case ADMIN -> source == DataSource.MAIN;
            case ADMIN_SECURISATION -> source != DataSource.MAIN;
            default -> false;
        };
    }
}
