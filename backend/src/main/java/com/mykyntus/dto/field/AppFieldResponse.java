package com.mykyntus.dto.field;

import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.FieldType;

import java.util.List;

public record AppFieldResponse(Long id, String code, String label, FieldSection section, String sectionLabel,
                               FieldType type, int position, boolean active, boolean published,
                               List<FieldOptionResponse> options) {
}
