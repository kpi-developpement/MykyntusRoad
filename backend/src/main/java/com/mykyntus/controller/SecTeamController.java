package com.mykyntus.controller;

import com.mykyntus.entity.Team;

import com.mykyntus.dto.dossier.DossierSearchRequest;
import com.mykyntus.dto.sec.*;
import com.mykyntus.service.DispatchService;
import com.mykyntus.service.PiloteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ADMIN_SECURISATION only (see SecurityConfig): the pilots of the team and the dispatch of the work. */
@RestController
@RequestMapping("/api/sec")
@RequiredArgsConstructor
public class SecTeamController {

    private final PiloteService piloteService;
    private final DispatchService dispatchService;

    // ------------------------------------------------------------------ pilots

    @GetMapping("/pilotes")
    public List<PiloteResponse> pilotes() {
        return piloteService.list();
    }

    @PostMapping("/pilotes")
    @ResponseStatus(HttpStatus.CREATED)
    public PiloteResponse createPilote(@Valid @RequestBody PiloteCreateRequest request) {
        return piloteService.create(request);
    }

    @PutMapping("/pilotes/{id}")
    public PiloteResponse updatePilote(@PathVariable Long id, @Valid @RequestBody PiloteUpdateRequest request) {
        return piloteService.update(id, request);
    }

    @DeleteMapping("/pilotes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePilote(@PathVariable Long id) {
        piloteService.delete(id);
    }

    // ------------------------------------------------------------------ dispatch

    /** Distribution of the dossiers matching the criteria. */
    @PostMapping("/dispatch/summary")
    public DispatchSummary summary(@RequestBody DossierSearchRequest criteria) {
        return dispatchService.summary(Team.SECURISATION, criteria);
    }

    @PostMapping("/dispatch")
    public DispatchResult dispatch(@RequestBody DispatchRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.dispatch(Team.SECURISATION, request, jwt.getSubject());
    }

    @PostMapping("/dispatch/assign")
    public DispatchResult assign(@RequestBody AssignRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.assign(Team.SECURISATION, request, jwt.getSubject());
    }

    @PostMapping("/dispatch/transfer")
    public DispatchResult transfer(@RequestBody TransferRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.transfer(Team.SECURISATION, request, jwt.getSubject());
    }

    @PostMapping("/dispatch/unassign")
    public DispatchResult unassign(@RequestBody UnassignRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.unassign(Team.SECURISATION, request, jwt.getSubject());
    }
}
