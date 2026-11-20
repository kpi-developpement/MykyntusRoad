package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

/** A possible value of a dropdown field, managed by the admin. */
@Entity
@Table(name = "field_option", uniqueConstraints = @UniqueConstraint(columnNames = {"field_id", "option_value"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "field_id")
    private AppField field;

    @Column(name = "option_value", nullable = false, length = 255)
    private String value;

    @Column(nullable = false)
    private int position;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
