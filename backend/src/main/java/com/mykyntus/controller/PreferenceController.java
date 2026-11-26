package com.mykyntus.controller;

import com.mykyntus.dto.pref.PreferenceRequest;
import com.mykyntus.dto.pref.PreferenceResponse;
import com.mykyntus.service.PreferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Settings of the connected account (each profile arranges its tables as it wants). */
@RestController
@RequestMapping("/api/me/preferences")
@RequiredArgsConstructor
public class PreferenceController {

    private final PreferenceService preferenceService;

    @GetMapping("/{key}")
    public PreferenceResponse get(@PathVariable String key, @AuthenticationPrincipal Jwt jwt) {
        return preferenceService.get(jwt.getSubject(), key);
    }

    @PutMapping("/{key}")
    public PreferenceResponse save(@PathVariable String key, @Valid @RequestBody PreferenceRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        return preferenceService.save(jwt.getSubject(), key, request.value());
    }
}
