package com.mykyntus.controller;

import com.mykyntus.dto.auth.LoginRequest;
import com.mykyntus.dto.auth.LoginResponse;
import com.mykyntus.dto.user.UserResponse;
import com.mykyntus.service.AuthService;
import com.mykyntus.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return userService.findByUsername(jwt.getSubject());
    }
}
