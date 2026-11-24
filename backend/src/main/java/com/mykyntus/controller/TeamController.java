package com.mykyntus.controller;

import com.mykyntus.dto.dossier.DossierSearchRequest;
import com.mykyntus.dto.sec.*;
import com.mykyntus.entity.Team;
import com.mykyntus.exception.ApiException;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.DispatchService;
import com.mykyntus.service.PiloteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Pilots and dispatch of any team: SECURISATION (sécurisation admin), PLANIFICATION and J (admin).
 * Every connected user can read the members of a team (names shown in the tables).
 */
@RestController
@RequestMapping("/api/teams/{team}")
@RequiredArgsConstructor
public class TeamController {

    private final PiloteService piloteService;
    private final DispatchService dispatchService;

    @GetMapping("/pilotes")
    public List<PiloteResponse> pilotes(@PathVariable String team) {
        return piloteService.list(Team.parse(team));
    }

    @PostMapping("/dispatch/summary")
    public DispatchSummary summary(@PathVariable String team, @RequestBody DossierSearchRequest criteria, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.summary(managed(team, jwt), criteria);
    }

    @PostMapping("/dispatch")
    public DispatchResult dispatch(@PathVariable String team, @RequestBody DispatchRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.dispatch(managed(team, jwt), request, jwt.getSubject());
    }

    @PostMapping("/dispatch/assign")
    public DispatchResult assign(@PathVariable String team, @RequestBody AssignRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.assign(managed(team, jwt), request, jwt.getSubject());
    }

    @PostMapping("/dispatch/transfer")
    public DispatchResult transfer(@PathVariable String team, @RequestBody TransferRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.transfer(managed(team, jwt), request, jwt.getSubject());
    }

    @PostMapping("/dispatch/unassign")
    public DispatchResult unassign(@PathVariable String team, @RequestBody UnassignRequest request, @AuthenticationPrincipal Jwt jwt) {
        return dispatchService.unassign(managed(team, jwt), request, jwt.getSubject());
    }

    /** The team, if the connected user is the admin who dispatches it. */
    private static Team managed(String value, Jwt jwt) {
        Team team = Team.parse(value);
        if (CurrentUser.from(jwt).role() != team.adminRole()) {
            throw ApiException.forbidden("Vous ne gérez pas le dispatch de l'équipe " + team.label());
        }
        return team;
    }
}
