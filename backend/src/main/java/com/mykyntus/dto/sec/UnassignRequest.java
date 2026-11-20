package com.mykyntus.dto.sec;

import com.mykyntus.dto.dossier.DossierSearchRequest;

/** Removes the pilot of the dossiers matching the criteria (only those of {@code pilote} when given). */
public record UnassignRequest(DossierSearchRequest criteria, String pilote, boolean includeTreated) {
}
