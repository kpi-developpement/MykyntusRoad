package com.mykyntus.dto.sec;

import java.time.LocalDateTime;

/** A sécurisation pilot with its workload (every date). */
public record PiloteResponse(Long id, String username, String fullName, boolean active, LocalDateTime createdAt,
                             long assigned, long treated) {
}
