package com.mykyntus.service;

import com.mykyntus.dto.worker.DossierWorkersResponse;
import com.mykyntus.dto.worker.WorkerResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppUserRepository;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.repository.DossierWorkerRepository;
import com.mykyntus.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * The pilots working on a dossier ("Pilote" column).
 * <p>
 * A pilot clicks the column and confirms: if nobody works the dossier yet he becomes its lead, otherwise he
 * joins the pilots already on it (they are shown to him before he confirms). Every take / join / leave is
 * written in the life cycle of the dossier. A pilot only edits the dossiers he works on.
 */
@Service
@RequiredArgsConstructor
public class WorkerService {

    private final DossierRepository dossierRepository;
    private final DossierWorkerRepository workerRepository;
    private final DossierEventRepository eventRepository;
    private final AppUserRepository userRepository;

    /** Pilots of a team on a dossier. */
    @Transactional(readOnly = true)
    public DossierWorkersResponse workers(Long dossierId, Team team) {
        return state(dossier(dossierId), team);
    }

    /** The connected user takes the dossier, or joins the pilots already on it. */
    @Transactional
    public DossierWorkersResponse join(Long dossierId, Team team, CurrentUser user) {
        Dossier d = dossier(dossierId);
        requireCanJoin(team, user);
        if (d.isCancelled()) {
            throw ApiException.badRequest("Ce dossier a été annulé avec son import");
        }
        String me = user.username();
        if (workerRepository.isWorker(d.getId(), team, me)) {
            return state(d, team);
        }
        String lead = team.assignee(d);
        LocalDateTime now = LocalDateTime.now();
        workerRepository.save(DossierWorker.builder().dossier(d).team(team).username(me).joinedAt(now).build());
        String name = name(me);
        String detail;
        if (lead == null) {
            team.assign(d, me, now);
            detail = "Pris en charge par " + name;
        } else if (lead.equals(me)) {
            detail = "Pris en charge par " + name;
        } else {
            List<String> already = new ArrayList<>();
            already.add(name(lead));
            workerRepository.findByDossierAndTeam(d.getId(), team).stream()
                    .map(DossierWorker::getUsername)
                    .filter(u -> !u.equals(lead) && !u.equals(me))
                    .forEach(u -> already.add(name(u)));
            detail = name + " a rejoint " + String.join(", ", already);
        }
        eventRepository.save(DossierEvent.builder()
                .dossier(d)
                .type(EventType.JOINED)
                .section(team.section())
                .fieldLabel(team.label())
                .newValue(name)
                .detail(detail)
                .actor(name)
                .build());
        return state(d, team);
    }

    /** The connected user stops working on the dossier (the next pilot becomes the lead). */
    @Transactional
    public DossierWorkersResponse leave(Long dossierId, Team team, CurrentUser user) {
        Dossier d = dossier(dossierId);
        requireCanJoin(team, user);
        String me = user.username();
        String lead = team.assignee(d);
        Optional<DossierWorker> mine = workerRepository.find(d.getId(), team, me);
        if (mine.isEmpty() && !me.equals(lead)) {
            return state(d, team);
        }
        if (me.equals(lead) && team.dispatched()) {
            throw ApiException.badRequest("Ce dossier vous a été attribué par le dispatch : seul l'admin peut le retirer");
        }
        mine.ifPresent(workerRepository::delete);
        workerRepository.flush();
        String name = name(me);
        String detail = name + " ne travaille plus sur le dossier";
        if (me.equals(lead)) {
            String next = workerRepository.findByDossierAndTeam(d.getId(), team).stream()
                    .map(DossierWorker::getUsername).filter(u -> !u.equals(me)).findFirst().orElse(null);
            team.assign(d, next, next == null ? null : LocalDateTime.now());
            if (next != null) {
                detail += " · " + name(next) + " reprend la main";
            }
        }
        eventRepository.save(DossierEvent.builder()
                .dossier(d)
                .type(EventType.LEFT)
                .section(team.section())
                .fieldLabel(team.label())
                .oldValue(name)
                .detail(detail)
                .actor(name)
                .build());
        return state(d, team);
    }

    /** A pilot only edits the dossiers he works on (lead or joined). Admins edit everything. */
    @Transactional(readOnly = true)
    public void requireWorking(Dossier dossier, CurrentUser user) {
        Team team = user.role().team();
        if (team == null) {
            return;
        }
        String me = user.username();
        if (me.equals(team.assignee(dossier)) || workerRepository.isWorker(dossier.getId(), team, me)) {
            return;
        }
        throw ApiException.forbidden(team.dispatched()
                ? "Ce dossier ne vous est pas attribué : rejoignez-le depuis la colonne Pilote"
                : "Prenez d'abord ce dossier (colonne Pilote) pour le modifier");
    }

    /** dossier id -> team -> usernames of the pilots who joined (lead excluded), for the table rows. */
    @Transactional(readOnly = true)
    public Map<Long, Map<String, List<String>>> joined(Collection<Dossier> dossiers) {
        Map<Long, Map<String, List<String>>> result = new HashMap<>();
        if (dossiers.isEmpty()) {
            return result;
        }
        Map<Long, Dossier> byId = new HashMap<>();
        dossiers.forEach(d -> byId.put(d.getId(), d));
        for (DossierWorker w : workerRepository.findByDossierIds(byId.keySet())) {
            Dossier d = byId.get(w.getDossier().getId());
            if (d == null || w.getUsername().equals(w.getTeam().assignee(d))) {
                continue;
            }
            result.computeIfAbsent(d.getId(), k -> new LinkedHashMap<>())
                    .computeIfAbsent(w.getTeam().name(), k -> new ArrayList<>())
                    .add(w.getUsername());
        }
        return result;
    }

    /** Every pilot on the dossier, all teams, lead first (life cycle). */
    @Transactional(readOnly = true)
    public List<WorkerResponse> all(Dossier d, Map<String, String> names) {
        List<WorkerResponse> list = new ArrayList<>();
        List<DossierWorker> rows = workerRepository.findByDossierIds(List.of(d.getId()));
        for (Team team : Team.values()) {
            list.addAll(build(d, team, rows.stream().filter(w -> w.getTeam() == team).toList(), names));
        }
        return list;
    }

    // ------------------------------------------------------------------ helpers

    private DossierWorkersResponse state(Dossier d, Team team) {
        Map<String, String> names = new HashMap<>();
        List<WorkerResponse> workers = build(d, team, workerRepository.findByDossierAndTeam(d.getId(), team), names);
        return new DossierWorkersResponse(d.getId(), team.name(), team.assignee(d), workers);
    }

    private List<WorkerResponse> build(Dossier d, Team team, List<DossierWorker> rows, Map<String, String> names) {
        String lead = team.assignee(d);
        List<WorkerResponse> list = new ArrayList<>();
        if (lead != null) {
            LocalDateTime at = rows.stream().filter(w -> w.getUsername().equals(lead)).map(DossierWorker::getJoinedAt).findFirst()
                    .orElse(team == Team.SECURISATION ? d.getAssignedAt() : d.getAssignedJAt());
            list.add(new WorkerResponse(team.name(), lead, names.computeIfAbsent(lead, this::name), true, at));
        }
        for (DossierWorker w : rows) {
            if (!w.getUsername().equals(lead)) {
                list.add(new WorkerResponse(team.name(), w.getUsername(), names.computeIfAbsent(w.getUsername(), this::name), false, w.getJoinedAt()));
            }
        }
        return list;
    }

    /** Pilots of the team, and the admin for the J pilots (he works with them, there is no dispatch). */
    private static void requireCanJoin(Team team, CurrentUser user) {
        boolean pilot = user.role().team() == team;
        boolean admin = team == Team.J && user.role() == Role.ADMIN;
        if (!pilot && !admin) {
            throw ApiException.forbidden("Seuls les pilotes « " + team.label() + " » travaillent ces dossiers");
        }
    }

    private Dossier dossier(Long id) {
        return dossierRepository.findById(id).orElseThrow(() -> ApiException.notFound("Dossier introuvable"));
    }

    private String name(String username) {
        return userRepository.findByUsername(username).map(PiloteService::displayName).orElse(username);
    }
}
