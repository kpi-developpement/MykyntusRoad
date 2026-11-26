package com.mykyntus.entity;

import java.util.Set;

/**
 * Application roles.
 * <ul>
 *   <li>ADMIN : main import, J-1 / J / J+1 columns, users. Sécurisation in read only (its published columns).</li>
 *   <li>ADMIN_SECURISATION : the sécurisation files, columns and dispatch of the sécurisation pilots.</li>
 *   <li>PILOTE_SECURISATION : works the day before, Sécurisation section only (up to "Etat final").</li>
 *   <li>PILOTE_J : works the J-1 (Cellule plani...), J and J+1 sections. Takes the dossiers himself
 *       (column "Pilote"), several pilots may work the same dossier.</li>
 * </ul>
 * The former PILOTE_PLANIFICATION role no longer exists: its accounts became PILOTE_J (see {@link #parse}).
 */
public enum Role {
    ADMIN(Set.of(FieldSection.J_MINUS_1, FieldSection.J, FieldSection.J_PLUS_1)),
    ADMIN_SECURISATION(Set.of(FieldSection.SECURISATION)),
    PILOTE_SECURISATION(Set.of(FieldSection.SECURISATION)),
    PILOTE_J(Set.of(FieldSection.J_MINUS_1, FieldSection.J, FieldSection.J_PLUS_1));

    /** Name of the removed planification role, still found in old tokens / rows. */
    public static final String LEGACY_PLANIFICATION = "PILOTE_PLANIFICATION";

    private final Set<FieldSection> editableSections;

    Role(Set<FieldSection> editableSections) {
        this.editableSections = editableSections;
    }

    /** Role from its name; the removed planification role maps to PILOTE_J. */
    public static Role parse(String name) {
        if (LEGACY_PLANIFICATION.equals(name)) {
            return PILOTE_J;
        }
        return valueOf(name);
    }

    public boolean canEdit(FieldSection section) {
        return editableSections.contains(section);
    }

    public Set<FieldSection> getEditableSections() {
        return editableSections;
    }

    /** Team of a pilot (null for the admins): a pilot only edits the dossiers he works on. */
    public Team team() {
        return switch (this) {
            case PILOTE_SECURISATION -> Team.SECURISATION;
            case PILOTE_J -> Team.J;
            default -> null;
        };
    }

    /** Sections whose columns (and dropdown values) this role administrates. */
    public boolean canConfigure(FieldSection section) {
        return switch (this) {
            case ADMIN -> section == FieldSection.J_MINUS_1 || section == FieldSection.J || section == FieldSection.J_PLUS_1;
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
