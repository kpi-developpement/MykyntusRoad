package com.mykyntus.dto.field;

import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.FieldType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AppFieldRequest(
        @NotBlank @Size(max = 150) String label,
        @NotNull FieldSection section,
        @NotNull FieldType type,
        Integer position,
        Boolean active,
        /** Also shown read only in the main table. */
        Boolean published,
        /** Sécurisation column worked by the planification team when the dossier is not "Planifié". */
        Boolean planification) {

    public AppFieldRequest(String label, FieldSection section, FieldType type, Integer position, Boolean active, Boolean published) {
        this(label, section, type, position, active, published, null);
    }
}
