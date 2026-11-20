package com.mykyntus.dto.flag;

import java.util.List;

/** Manual list of flags of a dossier (replaces the automatic ones). */
public record DossierFlagsRequest(List<String> codes) {
}
