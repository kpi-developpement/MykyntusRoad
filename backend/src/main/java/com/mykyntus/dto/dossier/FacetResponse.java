package com.mykyntus.dto.dossier;

import java.util.List;

/**
 * @param values     distinct values, most frequent first
 * @param emptyCount number of dossiers without value for this column
 * @param truncated  true when more values exist than returned
 */
public record FacetResponse(String key, List<FacetValue> values, long emptyCount, boolean truncated) {
}
