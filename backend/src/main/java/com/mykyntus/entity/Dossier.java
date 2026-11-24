package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** One line of the imported file = one dossier, identified by "Ordre de travail: ID Externe". */
@Entity
@Table(name = "dossier", indexes = {
        @Index(name = "idx_dossier_date", columnList = "dossierDate"),
        @Index(name = "idx_dossier_assigned", columnList = "assignedTo")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dossier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ordre de travail: ID Externe (ex: EPS-0022050200). */
    @Column(nullable = false, unique = true, length = 100)
    private String idExterne;

    @Column(nullable = false)
    private LocalDate dossierDate;

    /** Raw values of the imported file: column name -> value. */
    @Builder.Default
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "dossier_raw_value", joinColumns = @JoinColumn(name = "dossier_id"))
    @MapKeyColumn(name = "column_name", length = 255)
    @Column(name = "raw_value", columnDefinition = "TEXT")
    private Map<String, String> rawData = new LinkedHashMap<>();

    /** Values entered in the application columns (read side only, used for sorting). */
    @Builder.Default
    @OneToMany(mappedBy = "dossier", fetch = FetchType.LAZY)
    private List<DossierFieldValue> fieldValues = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_import_id")
    private ImportBatch lastImport;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    /** Effective flags, stored as "|P1|SECU|" (empty string = no flag) so they can be filtered with LIKE. */
    @Column(length = 600)
    private String flags;

    /** True once a user changed the flags by hand: imports no longer recompute them. Null for existing rows. */
    private Boolean flagsManual;

    /** Username of the sécurisation pilot the dossier is dispatched to. */
    @Column(length = 100)
    private String assignedTo;

    private LocalDateTime assignedAt;

    /** Username of the planification agent (dossiers not "Planifié"). */
    @Column(length = 100)
    private String assignedPlanif;

    private LocalDateTime assignedPlanifAt;

    /** Username of the J / J+1 agent. */
    @Column(length = 100)
    private String assignedJ;

    private LocalDateTime assignedJAt;

    /** "Cellule plani" filled with something else than "Planifié": the J-1 columns go to the planification team. */
    private Boolean routedPlanif;

    /** In the admin's file but in no sécurisation file: sécurisation columns set to N/A. */
    private Boolean horsSecu;

    /** Every column that applies to the dossier is filled (closes the dossier, see DossierProgressService). */
    private Boolean complete;

    public boolean isFlagsManual() {
        return Boolean.TRUE.equals(flagsManual);
    }

    public boolean isRoutedPlanif() {
        return Boolean.TRUE.equals(routedPlanif);
    }

    public boolean isHorsSecu() {
        return Boolean.TRUE.equals(horsSecu);
    }

    public boolean isComplete() {
        return Boolean.TRUE.equals(complete);
    }
}
