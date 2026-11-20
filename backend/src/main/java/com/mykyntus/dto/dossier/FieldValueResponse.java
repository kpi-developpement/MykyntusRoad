package com.mykyntus.dto.dossier;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * @param autoFilled values filled automatically at the same time (field id -> value),
 *                   e.g. "Pilote" and "Date de traitement" of the sécurisation section
 */
public record FieldValueResponse(Long dossierId, Long fieldId, String value, String updatedBy, LocalDateTime updatedAt,
                                 Map<Long, String> autoFilled) {
}
