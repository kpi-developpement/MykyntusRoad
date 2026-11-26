package com.mykyntus.dto.pref;

import java.time.LocalDateTime;

/** @param value JSON text of the setting, null when the user never changed it */
public record PreferenceResponse(String key, String value, LocalDateTime updatedAt) {
}
