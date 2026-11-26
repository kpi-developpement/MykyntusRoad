package com.mykyntus.dto.dossier;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * @param autoFilled values filled automatically at the same time (field id -> value),
 *                   e.g. the "Pilote" of the section
 * @param open       the conditional J-1 columns of the dossier are open (Cellule plani not "Planifié")
 */
public record FieldValueResponse(Long dossierId, Long fieldId, String value, String updatedBy, LocalDateTime updatedAt,
                                 Map<Long, String> autoFilled, boolean open) {
}
