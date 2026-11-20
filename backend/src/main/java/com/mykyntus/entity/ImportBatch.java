package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** One uploaded file. */
@Entity
@Table(name = "import_batch")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;

    /** Main file or sécurisation file 1/2/3. Null for legacy rows (= MAIN). */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DataSource source;

    @Column(nullable = false, length = 100)
    private String importedBy;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime importedAt = LocalDateTime.now();

    private int totalRows;
    private int createdRows;
    private int updatedRows;
    private int skippedRows;
}
