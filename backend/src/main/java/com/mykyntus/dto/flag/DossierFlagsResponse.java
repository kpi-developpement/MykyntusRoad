package com.mykyntus.dto.flag;

import java.util.List;

/** Flags of a dossier after a change. {@code manual} = false when they come from the automatic rules. */
public record DossierFlagsResponse(Long dossierId, List<String> flags, boolean manual) {
}
