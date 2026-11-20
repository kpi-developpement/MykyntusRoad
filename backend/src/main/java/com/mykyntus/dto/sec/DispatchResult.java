package com.mykyntus.dto.sec;

/** @param moved number of dossiers whose pilot changed */
public record DispatchResult(int moved, DispatchSummary summary) {
}
