package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Value selected by a user for one application field on one dossier. */
@Entity
@Table(name = "dossier_field_value", uniqueConstraints = @UniqueConstraint(columnNames = {"dossier_id", "field_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DossierFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id")
    private Dossier dossier;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "field_id")
    private AppField field;

    @Column(name = "selected_value", columnDefinition = "TEXT")
    private String value;

    @Column(length = 100)
    private String updatedBy;

    private LocalDateTime updatedAt;
}
