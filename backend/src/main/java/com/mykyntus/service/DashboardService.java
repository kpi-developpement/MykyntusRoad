package com.mykyntus.service;

import com.mykyntus.entity.Team;
import com.mykyntus.exception.ApiException;
import com.mykyntus.security.CurrentUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;

/**
 * Global view: per dossier date, how many dossiers are closed, late (red), soon late (orange) or on time,
 * plus the work of the teams. Also tells a pilot when new dossiers were dispatched to him.
 */
@Service
public class DashboardService {

    /** Widest range served in one call (about a year). */
    private static final int MAX_DAYS = 400;

    @PersistenceContext
    private EntityManager em;

    /**
     * @param status  dominant state of the day: LATE, SOON, ON_TIME, DONE (everything closed) or EMPTY
     * @param unassignedSecu not closed and without sécurisation pilot (sécurisation file dossiers)
     * @param unassignedJ    not closed and without J agent
     */
    public record DayStat(LocalDate date, long total, long done, long late, long soon, long onTime, long horsSecu,
                          long planification, long unassignedSecu, long unassignedJ, String status) {
    }

    /** One line per date of the range that has dossiers. */
    @Transactional(readOnly = true)
    public List<DayStat> days(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw ApiException.badRequest("Période invalide");
        }
        if (from.plusDays(MAX_DAYS).isBefore(to)) {
            throw ApiException.badRequest("Période trop longue (" + MAX_DAYS + " jours maximum)");
        }
        LocalDateTime now = LocalDateTime.now();
        List<Object[]> rows = em.createQuery("""
                select d.dossierDate, count(d),
                       sum(case when d.complete = true then 1 else 0 end),
                       sum(case when d.horsSecu = true then 1 else 0 end),
                       sum(case when d.routedPlanif = true then 1 else 0 end),
                       sum(case when (d.complete is null or d.complete = false) and d.assignedTo is null
                                 and (d.horsSecu is null or d.horsSecu = false) then 1 else 0 end),
                       sum(case when (d.complete is null or d.complete = false) and d.assignedJ is null then 1 else 0 end)
                from Dossier d where d.dossierDate between :from and :to
                group by d.dossierDate""", Object[].class)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        TreeMap<LocalDate, DayStat> map = new TreeMap<>();
        for (Object[] r : rows) {
            LocalDate date = (LocalDate) r[0];
            long total = num(r[1]);
            long done = num(r[2]);
            long open = total - done;
            long late = 0;
            long soon = 0;
            long onTime = 0;
            switch (DossierProgressService.delay(date, false, now)) {
                case LATE -> late = open;
                case SOON -> soon = open;
                default -> onTime = open;
            }
            String status = total == 0 ? "EMPTY" : late > 0 ? "LATE" : soon > 0 ? "SOON" : onTime > 0 ? "ON_TIME" : "DONE";
            map.put(date, new DayStat(date, total, done, late, soon, onTime, num(r[3]), num(r[4]), num(r[5]), num(r[6]), status));
        }
        return new ArrayList<>(map.values());
    }

    /**
     * @param team   team of the pilot (null for an admin)
     * @param open   dossiers dispatched to him and not closed
     * @param fresh  dispatched to him after {@code since}
     * @param latest last time a dossier was dispatched to him
     */
    public record Work(String team, long open, long fresh, LocalDateTime latest) {
    }

    /** New work of the connected pilot (polled by the application to alert him). */
    @Transactional(readOnly = true)
    public Work work(CurrentUser user, LocalDateTime since) {
        Team team = user.role().team();
        if (team == null) {
            return new Work(null, 0, 0, null);
        }
        String who = "d." + team.property();
        String at = "d." + team.dateProperty();
        Object[] r = em.createQuery("select sum(case when d.complete is null or d.complete = false then 1 else 0 end), "
                        + "sum(case when " + at + " > :since then 1 else 0 end), max(" + at + ") "
                        + "from Dossier d where " + who + " = :me", Object[].class)
                .setParameter("me", user.username())
                .setParameter("since", since == null ? LocalDateTime.now() : since)
                .getSingleResult();
        return new Work(team.name(), num(r[0]), num(r[1]), (LocalDateTime) r[2]);
    }

    private static long num(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }
}
