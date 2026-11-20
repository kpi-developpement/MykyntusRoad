package com.mykyntus.service;

import com.mykyntus.dto.sec.PiloteCreateRequest;
import com.mykyntus.dto.sec.PiloteResponse;
import com.mykyntus.dto.sec.PiloteUpdateRequest;
import com.mykyntus.entity.AppUser;
import com.mykyntus.entity.Role;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppUserRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.util.TextUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** The sécurisation admin manages his own team: the PILOTE_SECURISATION accounts. */
@Service
@RequiredArgsConstructor
public class PiloteService {

    private final AppUserRepository userRepository;
    private final DossierRepository dossierRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public List<PiloteResponse> list() {
        Map<String, long[]> loads = loads();
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.PILOTE_SECURISATION)
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
                .role(Role.PILOTE_SECURISATION)
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
        return toResponse(user, loads().getOrDefault(user.getUsername(), new long[2]));
    }

    /** Deletes the account; its dossiers go back to "not dispatched". */
    @Transactional
    public void delete(Long id) {
        AppUser user = pilote(id);
        dossierRepository.unassignAll(user.getUsername());
        userRepository.delete(user);
    }

    /** Active pilots by username (dispatch validation). */
    @Transactional(readOnly = true)
    public Map<String, AppUser> activePilotes() {
        Map<String, AppUser> map = new HashMap<>();
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.PILOTE_SECURISATION && u.isActive())
                .forEach(u -> map.put(u.getUsername(), u));
        return map;
    }

    @Transactional(readOnly = true)
    public List<AppUser> allPilotes() {
        return userRepository.findAll().stream().filter(u -> u.getRole() == Role.PILOTE_SECURISATION).toList();
    }

    public static String displayName(AppUser u) {
        return u.getFullName() != null ? u.getFullName() : u.getUsername();
    }

    private AppUser pilote(Long id) {
        AppUser user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Pilote introuvable"));
        if (user.getRole() != Role.PILOTE_SECURISATION) {
            throw ApiException.forbidden("Ce compte n'est pas un pilote sécurisation");
        }
        return user;
    }

    /** username -> [assigned, treated (état final filled)] over every date. */
    private Map<String, long[]> loads() {
        Map<String, long[]> map = new HashMap<>();
        List<Object[]> rows = em.createQuery("""
                select d.assignedTo, count(d),
                       sum(case when exists (select 1 from DossierFieldValue v where v.dossier = d
                                and v.field.code = 'sec_etat_final' and v.value is not null) then 1 else 0 end)
                from Dossier d where d.assignedTo is not null group by d.assignedTo""", Object[].class).getResultList();
        for (Object[] r : rows) {
            map.put((String) r[0], new long[]{((Number) r[1]).longValue(), r[2] == null ? 0 : ((Number) r[2]).longValue()});
        }
        return map;
    }

    private static PiloteResponse toResponse(AppUser u, long[] load) {
        return new PiloteResponse(u.getId(), u.getUsername(), u.getFullName(), u.isActive(), u.getCreatedAt(), load[0], load[1]);
    }
}
