package com.mykyntus.controller;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.DossierService;
import com.mykyntus.service.DossierTimelineService;
import com.mykyntus.service.DossierValueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dossiers")
@RequiredArgsConstructor
public class DossierController {

    private final DossierService dossierService;
    private final DossierValueService valueService;
    private final DossierTimelineService timelineService;

    /** Simple listing (date + ID Externe search). */
    @GetMapping
    public DossierTableResponse table(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return dossierService.search(new DossierSearchRequest(date, search, List.of(), null, page, size));
    }

    /** Full search: one filter per column + sort on any column. */
    @PostMapping("/search")
    public DossierTableResponse search(@RequestBody DossierSearchRequest request) {
        return dossierService.search(request);
    }

    /** Distinct values (with counts) of one column, used by the column filters. */
    @PostMapping("/facets")
    public FacetResponse facets(@Valid @RequestBody FacetRequest request) {
        return dossierService.facets(request);
    }

    /** Counters displayed above the table. */
    @PostMapping("/stats")
    public DossierStatsResponse stats(@RequestBody DossierSearchRequest request) {
        return dossierService.stats(request);
    }

    @PutMapping("/{dossierId}/values/{fieldId}")
    public FieldValueResponse updateValue(@PathVariable Long dossierId,
                                          @PathVariable Long fieldId,
                                          @RequestBody FieldValueUpdateRequest request,
                                          @AuthenticationPrincipal Jwt jwt) {
        return valueService.updateValue(dossierId, fieldId, request.value(), CurrentUser.from(jwt));
    }

    /** Life cycle of a dossier: stages reached and full history. */
    @GetMapping("/{dossierId}/timeline")
    public DossierTimelineResponse timeline(@PathVariable Long dossierId) {
        return timelineService.timeline(dossierId);
    }
}
