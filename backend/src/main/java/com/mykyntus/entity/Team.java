package com.mykyntus.entity;

import java.util.Locale;

/**
 * A team of pilots the dossiers are dispatched to. Each team has its own assignment on the dossier,
 * so a dossier can be with a sécurisation pilot, a planification agent and a J agent at the same time.
 */
public enum Team {
    /** Sécurisation pilots, dispatched by the sécurisation admin. */
    SECURISATION(Role.PILOTE_SECURISATION, Role.ADMIN_SECURISATION, "assignedTo", "assignedAt", "Pilote sécurisation"),
    /** Planification agents (dossiers not "Planifié"), dispatched by the admin. */
    PLANIFICATION(Role.PILOTE_PLANIFICATION, Role.ADMIN, "assignedPlanif", "assignedPlanifAt", "Agent planification"),
    /** J / J+1 agents, dispatched by the admin. */
    J(Role.PILOTE_J, Role.ADMIN, "assignedJ", "assignedJAt", "Agent J / J+1");

    private final Role pilotRole;
    private final Role adminRole;
    /** Properties of {@link Dossier} holding the username and the assignment date. */
    private final String property;
    private final String dateProperty;
    private final String label;

    Team(Role pilotRole, Role adminRole, String property, String dateProperty, String label) {
        this.pilotRole = pilotRole;
        this.adminRole = adminRole;
        this.property = property;
        this.dateProperty = dateProperty;
        this.label = label;
    }

    public Role pilotRole() {
        return pilotRole;
    }

    public Role adminRole() {
        return adminRole;
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

    public String assignee(Dossier d) {
        return switch (this) {
            case SECURISATION -> d.getAssignedTo();
            case PLANIFICATION -> d.getAssignedPlanif();
            case J -> d.getAssignedJ();
        };
    }

    /** "SECURISATION", "planification", "j"... */
    public static Team parse(String value) {
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw com.mykyntus.exception.ApiException.badRequest("Équipe inconnue : " + value);
        }
    }
}
