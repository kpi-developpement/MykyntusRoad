package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * A flag ("drapeau") that can be put on a dossier: the 11 predefined ones (detected automatically from
 * the imported columns) and the custom ones created by the users.
 */
@Entity
@Table(name = "flag_definition")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlagDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Short code shown on the badge (P1, SECU, R3&+...), unique, case-insensitive. */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    /** Meaning ("Travaux Hauteur"). */
    @Column(nullable = false, length = 120)
    private String label;

    /** Colour key (RED, ORANGE... for predefined flags, VIOLET_VIF, FUCHSIA, BLEU_CIEL, ARDOISE, PIERRE for custom ones). */
    @Column(nullable = false, length = 20)
    private String color;

    /** Predefined flag (automatic rule, cannot be deleted). */
    @Builder.Default
    @Column(nullable = false)
    private boolean builtin = false;

    @Column(nullable = false)
    private int position;

    @Column(length = 100)
    private String createdBy;
}
