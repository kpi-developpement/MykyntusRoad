package com.mykyntus.entity;

import java.util.Locale;

/**
 * A team of pilots working the dossiers. Each team has its own lead on the dossier (the property below),
 * so a dossier can be with a sécurisation pilot and a J pilot at the same time. Other pilots of the team
 * may join a dossier (see {@link DossierWorker}).
 */
public enum Team {
    /** Sécurisation pilots, dispatched by the sécurisation admin (they may also join a dossier). */
    SECURISATION(Role.PILOTE_SECURISATION, Role.ADMIN_SECURISATION, "assignedTo", "assignedAt", "Pilote sécurisation", FieldSection.SECURISATION),
    /** J-1 / J / J+1 pilots: no dispatch, each pilot takes the dossiers he works on. */
    J(Role.PILOTE_J, null, "assignedJ", "assignedJAt", "Pilote", FieldSection.J);

    private final Role pilotRole;
    /** Admin who dispatches the team (null = no dispatch, the pilots take the dossiers). */
    private final Role adminRole;
    /** Properties of {@link Dossier} holding the username and the assignment date. */
    private final String property;
    private final String dateProperty;
    private final String label;
    /** Section the assignment events are written in. */
    private final FieldSection section;

    Team(Role pilotRole, Role adminRole, String property, String dateProperty, String label, FieldSection section) {
        this.pilotRole = pilotRole;
        this.adminRole = adminRole;
        this.property = property;
        this.dateProperty = dateProperty;
        this.label = label;
        this.section = section;
    }

    public Role pilotRole() {
        return pilotRole;
    }

    public Role adminRole() {
        return adminRole;
    }

    public boolean dispatched() {
        return adminRole != null;
    }

    public String property() {
        return property;
    }

    public String dateProperty() {
        return dateProperty;
    }

    public String label() {
        return label;
    }

    public FieldSection section() {
        return section;
    }

    public String assignee(Dossier d) {
        return switch (this) {
            case SECURISATION -> d.getAssignedTo();
            case J -> d.getAssignedJ();
        };
    }

    /** Sets the lead of the team on the dossier. */
    public void assign(Dossier d, String username, java.time.LocalDateTime at) {
        switch (this) {
            case SECURISATION -> {
                d.setAssignedTo(username);
                d.setAssignedAt(at);
            }
            case J -> {
                d.setAssignedJ(username);
                d.setAssignedJAt(at);
            }
        }
    }

    /** "SECURISATION", "j"... */
    public static Team parse(String value) {
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw com.mykyntus.exception.ApiException.badRequest("Équipe inconnue : " + value);
        }
    }
}
