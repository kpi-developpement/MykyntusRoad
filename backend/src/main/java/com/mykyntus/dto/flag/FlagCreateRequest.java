package com.mykyntus.dto.flag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Custom flag: code + meaning + one of the 5 custom colours. */
public record FlagCreateRequest(@NotBlank @Size(max = 12) String code,
                                @NotBlank @Size(max = 120) String label,
                                @NotBlank String color) {
}
