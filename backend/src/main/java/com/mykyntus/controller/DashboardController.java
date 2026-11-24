package com.mykyntus.controller;

import com.mykyntus.dto.importing.BatchSummaryResponse;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.BatchService;
import com.mykyntus.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Global view: state of every date (any connected user, colours of the date picker), imported files
 * and their cancellation (admins, see SecurityConfig), new work of a pilot.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final BatchService batchService;

    @GetMapping("/dashboard/days")
    public List<DashboardService.DayStat> days(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return dashboardService.days(from, to);
    }

    @GetMapping("/batches")
    public List<BatchSummaryResponse> batches(@RequestParam(defaultValue = "200") int limit, @AuthenticationPrincipal Jwt jwt) {
        return batchService.list(CurrentUser.from(jwt), limit);
    }

    @GetMapping("/batches/{id}/rollback")
    public BatchSummaryResponse.Preview preview(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return batchService.preview(id, CurrentUser.from(jwt));
    }

    @PostMapping("/batches/{id}/rollback")
    public BatchSummaryResponse.Preview rollback(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return batchService.rollback(id, CurrentUser.from(jwt));
    }

    @GetMapping("/me/work")
    public DashboardService.Work work(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
                                      @AuthenticationPrincipal Jwt jwt) {
        return dashboardService.work(CurrentUser.from(jwt), since);
    }
}
