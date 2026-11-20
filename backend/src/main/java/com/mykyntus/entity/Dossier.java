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
        @Index(name = "idx_dossier_date", columnList = "dossierDate")
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
}
