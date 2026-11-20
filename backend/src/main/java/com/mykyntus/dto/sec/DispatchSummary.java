package com.mykyntus.dto.sec;

import java.util.List;
import java.util.Map;

/**
 * Distribution of the dossiers matching the criteria.
 *
 * @param unassignedFlags flags of the dossiers without pilot (code -> count)
 */
public record DispatchSummary(long total, long treated, long unassigned, Map<String, Long> unassignedFlags,
                              List<PiloteLoad> pilotes) {

    /** Load of one pilot: dossiers assigned, treated, remaining and their flags. */
    public record PiloteLoad(String username, String fullName, boolean active, long assigned, long treated,
                             Map<String, Long> flags) {
    }
}
