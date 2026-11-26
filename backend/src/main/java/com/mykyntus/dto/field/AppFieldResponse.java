package com.mykyntus.dto.field;

import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.FieldType;

import java.util.List;

/**
 * @param planification conditional J-1 column: only for the dossiers whose Cellule plani is not "Planifié"
 * @param auto          filled by the application (pilot, date de traitement = import date), never by hand
 */
public record AppFieldResponse(Long id, String code, String label, FieldSection section, String sectionLabel,
                               FieldType type, int position, boolean active, boolean published, boolean planification,
                               boolean auto, List<FieldOptionResponse> options) {
}
