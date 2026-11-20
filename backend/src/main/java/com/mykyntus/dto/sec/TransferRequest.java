package com.mykyntus.dto.sec;

import com.mykyntus.dto.dossier.DossierSearchRequest;

import java.util.List;

/**
 * Moves dossiers of a pilot (absent, overloaded...) to other pilots, spread equitably.
 *
 * @param count          number of dossiers to move (null = all)
 * @param includeTreated also move the dossiers already treated
 */
public record TransferRequest(DossierSearchRequest criteria, String from, List<String> to, Integer count,
                              boolean includeTreated) {
}
