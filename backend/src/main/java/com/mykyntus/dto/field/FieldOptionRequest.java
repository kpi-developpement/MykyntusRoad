package com.mykyntus.dto.field;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FieldOptionRequest(@NotBlank @Size(max = 255) String value, Integer position, Boolean active) {
}
