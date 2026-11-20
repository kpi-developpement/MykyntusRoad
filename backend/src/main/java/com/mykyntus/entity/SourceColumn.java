package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * A column discovered in an imported file. Columns are dynamic: any new header
 * found in a file is registered here so the UI can always display every column.
 */
@Entity
@Table(name = "source_column")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SourceColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Key of the column in the dossier data (prefixed for sécurisation files, ex: "S1::Statut"). */
    @Column(nullable = false, unique = true, length = 255)
    private String name;

    /** Header as written in the file. Null for legacy rows (= name). */
    @Column(length = 255)
    private String label;

    /** File the column comes from. Null for legacy rows (= MAIN). */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DataSource source;

    @Column(nullable = false)
    private int position;

    @Builder.Default
    @Column(nullable = false)
    private boolean visible = true;
}
