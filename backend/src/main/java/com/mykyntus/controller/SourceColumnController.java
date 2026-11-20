package com.mykyntus.controller;

import com.mykyntus.dto.importing.SourceColumnResponse;
import com.mykyntus.dto.importing.SourceColumnUpdateRequest;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.SourceColumnService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ADMIN / ADMIN_SECURISATION: columns discovered in their imported files. */
@RestController
@RequestMapping("/api/source-columns")
@RequiredArgsConstructor
public class SourceColumnController {

    private final SourceColumnService service;

    @GetMapping
    public List<SourceColumnResponse> findAll(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(CurrentUser.from(jwt));
    }

    @PutMapping("/{id}")
    public SourceColumnResponse update(@PathVariable Long id, @RequestBody SourceColumnUpdateRequest request,
                                       @AuthenticationPrincipal Jwt jwt) {
        return service.setVisible(id, request.visible(), CurrentUser.from(jwt));
    }
}
