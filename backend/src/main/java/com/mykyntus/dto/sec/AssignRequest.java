package com.mykyntus.dto.sec;

import java.util.List;

/** Manual change of the dispatch: gives these dossiers to a pilot (null = no pilot). */
public record AssignRequest(List<Long> dossierIds, String pilote) {
}
