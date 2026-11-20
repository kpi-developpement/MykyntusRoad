package com.mykyntus.dto.sec;

import jakarta.validation.constraints.Size;

/** Password left blank = unchanged. */
public record PiloteUpdateRequest(@Size(max = 150) String fullName, boolean active, @Size(max = 100) String password) {
}
