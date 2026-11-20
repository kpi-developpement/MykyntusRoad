package com.mykyntus.dto.user;

import com.mykyntus.entity.Role;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Password is optional: left blank = unchanged. */
public record UserUpdateRequest(
        @Size(max = 150) String fullName,
        @NotNull Role role,
        boolean active,
        @Size(max = 100) String password) {
}
