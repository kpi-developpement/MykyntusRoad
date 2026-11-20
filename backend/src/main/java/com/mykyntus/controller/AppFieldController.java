package com.mykyntus.controller;

import com.mykyntus.dto.field.AppFieldRequest;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.field.FieldOptionRequest;
import com.mykyntus.dto.field.FieldOptionResponse;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.AppFieldService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** GET for every authenticated user; writes by ADMIN (main sections) / ADMIN_SECURISATION (sécurisation). */
@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
public class AppFieldController {

    private final AppFieldService fieldService;

    @GetMapping
    public List<AppFieldResponse> findAll() {
        return fieldService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppFieldResponse create(@Valid @RequestBody AppFieldRequest request, @AuthenticationPrincipal Jwt jwt) {
        return fieldService.create(request, CurrentUser.from(jwt));
    }

    @PutMapping("/{id}")
    public AppFieldResponse update(@PathVariable Long id, @Valid @RequestBody AppFieldRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        return fieldService.update(id, request, CurrentUser.from(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        fieldService.delete(id, CurrentUser.from(jwt));
    }

    @PostMapping("/{fieldId}/options")
    @ResponseStatus(HttpStatus.CREATED)
    public FieldOptionResponse addOption(@PathVariable Long fieldId, @Valid @RequestBody FieldOptionRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return fieldService.addOption(fieldId, request, CurrentUser.from(jwt));
    }

    @PutMapping("/{fieldId}/options/{optionId}")
    public FieldOptionResponse updateOption(@PathVariable Long fieldId, @PathVariable Long optionId,
                                            @Valid @RequestBody FieldOptionRequest request,
                                            @AuthenticationPrincipal Jwt jwt) {
        return fieldService.updateOption(fieldId, optionId, request, CurrentUser.from(jwt));
    }

    @DeleteMapping("/{fieldId}/options/{optionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOption(@PathVariable Long fieldId, @PathVariable Long optionId, @AuthenticationPrincipal Jwt jwt) {
        fieldService.deleteOption(fieldId, optionId, CurrentUser.from(jwt));
    }
}
