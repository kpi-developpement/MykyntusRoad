package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** A setting of one account (e.g. order and visibility of the columns of a table), stored as JSON text. */
@Entity
@Table(name = "user_preference",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_preference", columnNames = {"username", "pref_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(name = "pref_key", nullable = false, length = 120)
    private String key;

    @Column(name = "pref_value", columnDefinition = "TEXT")
    private String value;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
