package com.mykyntus.entity;

import java.util.Set;

/**
 * Application roles.
 * <ul>
 *   <li>ADMIN : main import, J-1 / J / J+1 columns, users. Sécurisation is read only.</li>
 *   <li>ADMIN_SECURISATION : the 3 sécurisation files, visible columns and sécurisation values.</li>
 *   <li>PILOTE_SECURISATION : works the day before (Sécurisation + J-1 sections).</li>
 *   <li>PILOTE_J : works on the J and J+1 sections.</li>
 * </ul>
 */
public enum Role {
    ADMIN(Set.of(FieldSection.J_MINUS_1, FieldSection.J, FieldSection.J_PLUS_1)),
    ADMIN_SECURISATION(Set.of(FieldSection.SECURISATION, FieldSection.J_MINUS_1)),
    PILOTE_SECURISATION(Set.of(FieldSection.SECURISATION, FieldSection.J_MINUS_1)),
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

    /** Sections whose columns (and dropdown values) this role administrates. */
    public boolean canConfigure(FieldSection section) {
        return switch (this) {
            case ADMIN -> section != FieldSection.SECURISATION;
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
