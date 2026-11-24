package com.mykyntus.service;

import com.mykyntus.dto.dossier.DossierSearchRequest;
import com.mykyntus.dto.sec.PiloteCreateRequest;
import com.mykyntus.dto.sec.PiloteResponse;
import com.mykyntus.dto.sec.PiloteUpdateRequest;
import com.mykyntus.entity.AppUser;
import com.mykyntus.entity.Team;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppUserRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.repository.search.DossierSearchRepository;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The pilots of a team. The sécurisation admin manages his own team (PILOTE_SECURISATION accounts);
 * the planification and J agents are created by the admin in the users screen.
 */
@Service
@RequiredArgsConstructor
public class PiloteService {

    private final AppUserRepository userRepository;
    private final DossierRepository dossierRepository;
    private final DossierSearchRepository searchRepository;
    private final DossierProgressService progressService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<PiloteResponse> list() {
        return list(Team.SECURISATION);
    }

    @Transactional(readOnly = true)
    public List<PiloteResponse> list(Team team) {
        Map<String, long[]> loads = loads(team);
        return allPilotes(team).stream()
                .sorted(Comparator.comparing((AppUser u) -> !u.isActive()).thenComparing(u -> displayName(u).toLowerCase()))
                .map(u -> toResponse(u, loads.getOrDefault(u.getUsername(), new long[2])))
                .toList();
    }

    @Transactional
    public PiloteResponse create(PiloteCreateRequest request) {
        String username = request.username().trim();
        if (!username.matches("[A-Za-z0-9._@-]{2,100}")) {
            throw ApiException.badRequest("Identifiant invalide (lettres, chiffres, . _ - @)");
        }
        if (userRepository.existsByUsername(username)) {
            throw ApiException.conflict("Cet identifiant existe déjà");
        }
        AppUser user = userRepository.save(AppUser.builder()
                .username(username)
                .password(passwordEncoder.encode(request.password()))
                .fullName(TextUtils.trimToNull(request.fullName()))
                .role(Team.SECURISATION.pilotRole())
                .build());
        return toResponse(user, new long[2]);
    }

    @Transactional
    public PiloteResponse update(Long id, PiloteUpdateRequest request) {
        AppUser user = pilote(id);
        user.setFullName(TextUtils.trimToNull(request.fullName()));
        user.setActive(request.active());
        String password = TextUtils.trimToNull(request.password());
        if (password != null) {
            if (password.length() < 6) {
                throw ApiException.badRequest("Le mot de passe doit contenir au moins 6 caractères");
            }
            user.setPassword(passwordEncoder.encode(password));
        }
        return toResponse(user, loads(Team.SECURISATION).getOrDefault(user.getUsername(), new long[2]));
    }

    /** Deletes the account; its dossiers go back to "not dispatched". */
    @Transactional
    public void delete(Long id) {
        AppUser user = pilote(id);
        dossierRepository.unassignAll(user.getUsername());
        userRepository.delete(user);
    }

    /** Active pilots of the team by username (dispatch validation). */
    @Transactional(readOnly = true)
    public Map<String, AppUser> activePilotes(Team team) {
        Map<String, AppUser> map = new HashMap<>();
        allPilotes(team).stream().filter(AppUser::isActive).forEach(u -> map.put(u.getUsername(), u));
        return map;
    }

    @Transactional(readOnly = true)
    public List<AppUser> allPilotes(Team team) {
        return userRepository.findAll().stream().filter(u -> u.getRole() == team.pilotRole()).toList();
    }

    public static String displayName(AppUser u) {
        return u.getFullName() != null ? u.getFullName() : u.getUsername();
    }

    private AppUser pilote(Long id) {
        AppUser user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Pilote introuvable"));
        if (user.getRole() != Team.SECURISATION.pilotRole()) {
            throw ApiException.forbidden("Ce compte n'est pas un pilote sécurisation");
        }
        return user;
    }

    /** username -> [assigned, treated] over every date. */
    private Map<String, long[]> loads(Team team) {
        Map<String, long[]> map = new HashMap<>();
        for (DossierSearchRepository.ScopeRow row : searchRepository.scope(DossierSearchRequest.empty(), team, progressService.treatedFields(team))) {
            if (row.assignedTo() == null) {
                continue;
            }
            long[] c = map.computeIfAbsent(row.assignedTo(), k -> new long[2]);
            c[0]++;
            if (row.treated()) {
                c[1]++;
            }
        }
        return map;
    }

    private static PiloteResponse toResponse(AppUser u, long[] load) {
        return new PiloteResponse(u.getId(), u.getUsername(), u.getFullName(), u.isActive(), u.getCreatedAt(), load[0], load[1]);
    }
}
