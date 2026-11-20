package com.mykyntus.dto.sec;

import com.mykyntus.dto.dossier.DossierSearchRequest;

import java.util.List;

/**
 * Equitable dispatch of the dossiers matching the criteria between the selected pilots.
 *
 * @param onlyUnassigned true = only the dossiers without pilot (the current loads are taken into account),
 *                       false = every dossier not treated yet is dispatched again
 */
public record DispatchRequest(DossierSearchRequest criteria, List<String> pilotes, boolean onlyUnassigned) {
}
