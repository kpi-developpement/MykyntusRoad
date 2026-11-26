package com.mykyntus.controller;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.flag.DossierFlagsRequest;
import com.mykyntus.dto.flag.DossierFlagsResponse;
import com.mykyntus.service.ExportService;
import com.mykyntus.service.FlagService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.DossierService;
import com.mykyntus.service.DossierTimelineService;
import com.mykyntus.service.DossierValueService;
import com.mykyntus.service.WorkerService;
import com.mykyntus.dto.worker.DossierWorkersResponse;
import com.mykyntus.entity.Team;
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
    private final FlagService flagService;
    private final ExportService exportService;
    private final WorkerService workerService;

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

    /** Manual flags of a dossier (the automatic detection no longer applies to it). */
    @PutMapping("/{dossierId}/flags")
    public DossierFlagsResponse setFlags(@PathVariable Long dossierId, @RequestBody DossierFlagsRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return flagService.setManual(dossierId, request.codes(), CurrentUser.from(jwt));
    }

    /** Back to the flags detected from the dossier columns. */
    @DeleteMapping("/{dossierId}/flags")
    public DossierFlagsResponse resetFlags(@PathVariable Long dossierId, @AuthenticationPrincipal Jwt jwt) {
        return flagService.reset(dossierId, CurrentUser.from(jwt));
    }

    /** Excel export of the dossiers matching the criteria (every page), flags included. */
    @PostMapping("/export")
    public ResponseEntity<byte[]> export(@RequestBody ExportRequest request) {
        byte[] content = exportService.export(request);
        String name = "dossiers-" + LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }

    /** Pilots of a team on the dossier (shown before taking / joining it). */
    @GetMapping("/{dossierId}/workers/{team}")
    public DossierWorkersResponse workers(@PathVariable Long dossierId, @PathVariable String team) {
        return workerService.workers(dossierId, Team.parse(team));
    }

    /** The connected pilot takes the dossier, or joins the pilots already working on it. */
    @PostMapping("/{dossierId}/workers/{team}")
    public DossierWorkersResponse join(@PathVariable Long dossierId, @PathVariable String team, @AuthenticationPrincipal Jwt jwt) {
        return workerService.join(dossierId, Team.parse(team), CurrentUser.from(jwt));
    }

    /** The connected pilot stops working on the dossier. */
    @DeleteMapping("/{dossierId}/workers/{team}")
    public DossierWorkersResponse leave(@PathVariable Long dossierId, @PathVariable String team, @AuthenticationPrincipal Jwt jwt) {
        return workerService.leave(dossierId, Team.parse(team), CurrentUser.from(jwt));
    }

    /** Life cycle of a dossier: stages reached and full history. */
    @GetMapping("/{dossierId}/timeline")
    public DossierTimelineResponse timeline(@PathVariable Long dossierId) {
        return timelineService.timeline(dossierId);
    }
}
