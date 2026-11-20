package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** One step of the life cycle of a dossier (audit trail, never modified). */
@Entity
@Table(name = "dossier_event", indexes = @Index(name = "idx_dossier_event_dossier", columnList = "dossier_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DossierEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id")
    private Dossier dossier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventType type;

    /** Section of the changed value (VALUE_* events). */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private FieldSection section;

    @Column(length = 150)
    private String fieldLabel;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    /** Free description (file name, changed columns...). */
    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(length = 150)
    private String actor;

    @Builder.Default
    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime at = LocalDateTime.now();
}
