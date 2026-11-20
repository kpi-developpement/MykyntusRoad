package com.mykyntus.dto.flag;

public record FlagResponse(Long id, String code, String label, String color, boolean builtin, int position) {
}
