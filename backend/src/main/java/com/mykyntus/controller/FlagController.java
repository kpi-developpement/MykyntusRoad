package com.mykyntus.controller;

import com.mykyntus.dto.flag.FlagCreateRequest;
import com.mykyntus.dto.flag.FlagResponse;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.FlagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Flag definitions: the 11 predefined ones + custom flags (reusable and filterable everywhere). */
@RestController
@RequestMapping("/api/flags")
@RequiredArgsConstructor
public class FlagController {

    private final FlagService flagService;

    @GetMapping
    public List<FlagResponse> list() {
        return flagService.definitions();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FlagResponse create(@Valid @RequestBody FlagCreateRequest request, @AuthenticationPrincipal Jwt jwt) {
        return flagService.create(request, CurrentUser.from(jwt));
    }
}
