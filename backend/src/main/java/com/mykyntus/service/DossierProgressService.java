package com.mykyntus.service;

import com.mykyntus.entity.AppField;
import com.mykyntus.entity.Dossier;
import com.mykyntus.entity.DossierFieldValue;
import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.FieldType;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.DossierFieldValueRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Where a dossier stands: which team works its J-1 columns (sécurisation or planification),
 * whether every column that applies to it is filled (closed) and whether it is late.
 * <ul>
 *   <li>Delay: the dossier must be closed before J+1 at 12:00. From J+1 00:00 it is "bientôt en retard"
 *       (orange), from J+1 12:00 "en retard" (red).</li>
 *   <li>Closed: every active column filled, except the automatic ones, the "Objet mail" of a mail answered
 *       something else than "Oui", and the sécurisation columns of a dossier absent from the sécurisation files.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DossierProgressService {

    public static final String CELLULE_PLANI = "j1_cellule_plani";
    public static final String ETAT_FINAL = "sec_etat_final";
    public static final String COMMENTAIRE_SECU = "sec_commentaire";
    /** "Objet mail" column of a mail column: same code + this suffix. */
    public static final String OBJET_SUFFIX = "_objet";
    /** J+1 at this time = deadline. */
    public static final LocalTime DEADLINE = LocalTime.NOON;
    private static final int CHUNK = 500;

    /** Delay of a dossier. */
    public enum Delay {
        /** Every column filled. */
        DONE,
        /** Before J+1. */
        ON_TIME,
        /** J+1 morning, not closed yet (orange). */
        SOON,
        /** After J+1 12:00, not closed (red). */
        LATE
    }

    private final DossierRepository dossierRepository;
    private final DossierFieldValueRepository valueRepository;
    private final AppFieldRepository fieldRepository;

    // ------------------------------------------------------------------ rules

    /** The J-1 columns of this dossier go to the planification team. */
    public static boolean routedToPlanif(String cellulePlani) {
        String v = TextUtils.normalize(cellulePlani);
        return !v.isEmpty() && !v.equals("planifie");
    }

    /** Section a column belongs to for this dossier (a J-1 column moves to PLANIFICATION). */
    public static FieldSection effectiveSection(AppField field, Dossier dossier) {
        return field.isPlanification() && dossier.isRoutedPlanif() ? FieldSection.PLANIFICATION : field.getSection();
    }

    public static boolean isObjet(AppField field) {
        return field.getCode().endsWith(OBJET_SUFFIX);
    }

    /** Code of the mail column an "Objet mail" column belongs to. */
    public static String mailCodeOf(AppField objet) {
        return objet.getCode().substring(0, objet.getCode().length() - OBJET_SUFFIX.length());
    }

    /** Must this column be filled for the dossier to be closed? */
    public static boolean applies(AppField f, Dossier d, Map<String, String> valuesByCode) {
        if (!f.isActive() || f.getType() == FieldType.USER) {
            return false;
        }
        boolean secu = f.getSection() == FieldSection.SECURISATION || f.getSection() == FieldSection.J_MINUS_1;
        if (secu && d.isHorsSecu()) {
            return false;
        }
        if (isObjet(f)) {
            return "oui".equals(TextUtils.normalize(valuesByCode.get(mailCodeOf(f))));
        }
        return true;
    }

    public static Delay delay(LocalDate dossierDate, boolean complete, LocalDateTime now) {
        if (complete) {
            return Delay.DONE;
        }
        if (dossierDate == null) {
            return Delay.ON_TIME;
        }
        LocalDate nextDay = dossierDate.plusDays(1);
        LocalDate today = now.toLocalDate();
        if (today.isBefore(nextDay)) {
            return Delay.ON_TIME;
        }
        if (today.equals(nextDay) && now.toLocalTime().isBefore(DEADLINE)) {
            return Delay.SOON;
        }
        return Delay.LATE;
    }

    public static Delay delay(Dossier d) {
        return delay(d.getDossierDate(), d.isComplete(), LocalDateTime.now());
    }

    /**
     * Fields that must all be filled for a dossier to count as treated by a team (dispatch counters):
     * sécurisation = "Etat final", planification = its dropdown columns, J = null (dossier closed).
     */
    @Transactional(readOnly = true)
    public List<Long> treatedFields(com.mykyntus.entity.Team team) {
        List<AppField> active = fieldRepository.findAllWithOptions().stream().filter(AppField::isActive).toList();
        return switch (team) {
            case SECURISATION -> active.stream().filter(f -> f.getCode().equals(ETAT_FINAL)).map(AppField::getId).toList();
            case PLANIFICATION -> active.stream()
                    .filter(f -> f.isPlanification() && f.getType() == FieldType.SELECT)
                    .filter(f -> f.getOptions().stream().anyMatch(com.mykyntus.entity.FieldOption::isActive))
                    .map(AppField::getId).toList();
            case J -> null;
        };
    }

    // ------------------------------------------------------------------ refresh

    /** Recomputes the planification routing and the "closed" state of one dossier. */
    @Transactional
    public void refresh(Dossier dossier) {
        refresh(List.of(dossier));
    }

    @Transactional
    public void refresh(Collection<Dossier> dossiers) {
        if (dossiers.isEmpty()) {
            return;
        }
        List<AppField> fields = fieldRepository.findAll().stream().filter(AppField::isActive).toList();
        Map<Long, Map<String, String>> values = new HashMap<>();
        List<Long> ids = dossiers.stream().map(Dossier::getId).toList();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            for (DossierFieldValue v : valueRepository.findByDossierIds(ids.subList(i, Math.min(i + CHUNK, ids.size())))) {
                values.computeIfAbsent(v.getDossier().getId(), k -> new HashMap<>()).put(v.getField().getCode(), v.getValue());
            }
        }
        for (Dossier d : dossiers) {
            apply(d, fields, values.getOrDefault(d.getId(), Map.of()));
        }
    }

    private void apply(Dossier d, List<AppField> fields, Map<String, String> byCode) {
        d.setRoutedPlanif(routedToPlanif(byCode.get(CELLULE_PLANI)));
        List<AppField> required = fields.stream().filter(f -> applies(f, d, byCode)).toList();
        boolean complete = !required.isEmpty() && required.stream().allMatch(f -> TextUtils.trimToNull(byCode.get(f.getCode())) != null);
        d.setComplete(complete);
    }

    /** Every dossier (after a change of the columns, or once at startup). */
    @Transactional
    public int refreshAll() {
        List<Long> ids = dossierRepository.findAllIds();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            List<Dossier> chunk = dossierRepository.findAllById(ids.subList(i, Math.min(i + CHUNK, ids.size())));
            refresh(chunk);
            dossierRepository.saveAll(chunk);
        }
        log.info("Progress of {} dossier(s) recomputed", ids.size());
        return ids.size();
    }
}
