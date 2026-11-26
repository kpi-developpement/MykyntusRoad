package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A pilot working on a dossier for his team. The first one who takes a dossier also becomes its lead
 * ({@link Team#assignee}); the others joined him. Several pilots of the same team may work the same dossier.
 */
@Entity
@Table(name = "dossier_worker",
        uniqueConstraints = @UniqueConstraint(name = "uk_dossier_worker", columnNames = {"dossier_id", "team", "username"}),
        indexes = {
                @Index(name = "idx_dossier_worker_dossier", columnList = "dossier_id"),
                @Index(name = "idx_dossier_worker_user", columnList = "username")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DossierWorker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id")
    private Dossier dossier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Team team;

    @Column(nullable = false, length = 100)
    private String username;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime joinedAt = LocalDateTime.now();
}
