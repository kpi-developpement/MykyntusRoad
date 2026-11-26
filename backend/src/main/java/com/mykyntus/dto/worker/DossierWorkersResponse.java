package com.mykyntus.dto.worker;

import java.util.List;

/**
 * Pilots of one team on a dossier, after a take / join / leave.
 *
 * @param lead    username of the lead (null = nobody)
 * @param workers every pilot of the team on the dossier, lead first
 */
public record DossierWorkersResponse(Long dossierId, String team, String lead, List<WorkerResponse> workers) {
}
