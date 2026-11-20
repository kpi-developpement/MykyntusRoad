package com.mykyntus.dto.user;

import com.mykyntus.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 100) String username,
        @NotBlank @Size(min = 6, max = 100) String password,
        @Size(max = 150) String fullName,
        @NotNull Role role) {
}
