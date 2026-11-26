package com.mykyntus.dto.worker;

import java.time.LocalDateTime;

/**
 * A pilot working on a dossier.
 *
 * @param lead first pilot who took the dossier (or the one it was dispatched to)
 */
public record WorkerResponse(String team, String username, String name, boolean lead, LocalDateTime joinedAt) {
}
