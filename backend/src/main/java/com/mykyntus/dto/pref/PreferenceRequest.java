package com.mykyntus.dto.pref;

import jakarta.validation.constraints.Size;

/** @param value JSON text of the setting (null = back to the default) */
public record PreferenceRequest(@Size(max = 50_000) String value) {
}
