package com.mykyntus.security;

import com.mykyntus.entity.Role;
import org.springframework.security.oauth2.jwt.Jwt;

/** Lightweight view of the authenticated user, built from the JWT. */
public record CurrentUser(String username, Role role) {

    public static CurrentUser from(Jwt jwt) {
        return new CurrentUser(jwt.getSubject(), Role.valueOf(jwt.getClaimAsString(JwtService.ROLE_CLAIM)));
    }
}
