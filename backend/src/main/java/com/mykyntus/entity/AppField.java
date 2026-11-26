package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/** A column of our application (Cellule plani, Mail / Teams, ...), filled by the users. */
@Entity
@Table(name = "app_field")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false, length = 150)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FieldSection section;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FieldType type = FieldType.SELECT;

    @Column(nullable = false)
    private int position;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    /** Also shown (read only) in the main follow-up table, e.g. "Etat final". Nullable for existing rows. */
    private Boolean published;

    public boolean isPublished() {
        return Boolean.TRUE.equals(published);
    }

    /**
     * Conditional J-1 column: it only applies (shown, editable, required) to the dossiers whose
     * "Cellule plani" is not "Planifié" (set to "Ouvert" by hand).
     */
    private Boolean planification;

    public boolean isPlanification() {
        return Boolean.TRUE.equals(planification);
    }

    @Builder.Default
    @OneToMany(mappedBy = "field", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<FieldOption> options = new ArrayList<>();
}
