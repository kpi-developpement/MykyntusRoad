package com.mykyntus.dto.auth;

import com.mykyntus.dto.user.UserResponse;

public record LoginResponse(String token, UserResponse user) {
}
