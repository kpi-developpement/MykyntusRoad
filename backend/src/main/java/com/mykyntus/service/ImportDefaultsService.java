package com.mykyntus.service;

import com.mykyntus.entity.AppField;
import com.mykyntus.entity.Dossier;
import com.mykyntus.entity.DossierFieldValue;
import com.mykyntus.entity.FieldOption;
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
import java.util.*;
import java.util.function.Function;

/**
 * Values every dossier receives when it is injected, so the file is ready for everyone straight away:
 * <ul>
 *   <li>"Date de traitement" = the date the file bringing the dossier was imported;</li>
 *   <li>"Cellule plani" = "Planifié" (the conditional J-1 columns stay closed until someone sets it to "Ouvert").</li>
 * </ul>
 * Only empty values are filled: a value already there is never replaced.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportDefaultsService {

    private static final int CHUNK = 500;

    private final AppFieldRepository fieldRepository;
    private final DossierFieldValueRepository valueRepository;
    private final DossierRepository dossierRepository;

    /** Fills the defaults of freshly imported (or updated) dossiers. */
    @Transactional
    public int apply(Collection<Dossier> dossiers, LocalDate importDate) {
        Defaults defaults = defaults();
        if (defaults.isEmpty() || dossiers.isEmpty()) {
            return 0;
        }
        return fill(dossiers, defaults, d -> importDate);
    }

    /**
     * Dossiers imported before these defaults existed: "Date de traitement" = day the dossier was created
     * by its first import, "Cellule plani" = "Planifié". Runs at startup, only touches empty values.
     */
    @Transactional
    public int backfill() {
        Defaults defaults = defaults();
        if (defaults.isEmpty()) {
            return 0;
        }
        List<Long> ids = new ArrayList<>();
        for (AppField f : defaults.fields()) {
            ids.addAll(dossierRepository.findIdsWithoutValue(f.getId()));
        }
        List<Long> distinct = ids.stream().distinct().sorted().toList();
        int filled = 0;
        for (int i = 0; i < distinct.size(); i += CHUNK) {
            List<Dossier> chunk = dossierRepository.findAllById(distinct.subList(i, Math.min(i + CHUNK, distinct.size())));
            filled += fill(chunk, defaults, d -> d.getCreatedAt() == null ? LocalDate.now() : d.getCreatedAt().toLocalDate());
        }
        if (filled > 0) {
            log.info("Default values written on {} dossier column(s) (date de traitement, Cellule plani)", filled);
        }
        return filled;
    }

    /** "Date de traitement" of every dossier = day of its first import (the rule changed: it was the day a pilot worked it). */
    @Transactional
    public int realignTreatmentDates() {
        AppField date = byCode(DossierProgressService.DATE_TRAITEMENT);
        if (date == null) {
            return 0;
        }
        int changed = 0;
        List<Long> ids = dossierRepository.findAllIds();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            List<Long> chunk = ids.subList(i, Math.min(i + CHUNK, ids.size()));
            Map<Long, Dossier> dossiers = new HashMap<>();
            dossierRepository.findAllById(chunk).forEach(d -> dossiers.put(d.getId(), d));
            for (DossierFieldValue v : valueRepository.findByDossierIds(chunk)) {
                if (!v.getField().getId().equals(date.getId())) {
                    continue;
                }
                Dossier d = dossiers.get(v.getDossier().getId());
                if (d == null || d.getCreatedAt() == null) {
                    continue;
                }
                String expected = d.getCreatedAt().toLocalDate().toString();
                if (!expected.equals(v.getValue())) {
                    v.setValue(expected);
                    v.setUpdatedBy(DossierProgressService.DEFAULT_ACTOR);
                    v.setUpdatedAt(LocalDateTime.now());
                    changed++;
                }
            }
        }
        if (changed > 0) {
            log.info("Date de traitement realigned on the import date for {} dossier(s)", changed);
        }
        return changed;
    }

    // ------------------------------------------------------------------ helpers

    private record Defaults(AppField date, AppField plani, String planifie) {
        boolean isEmpty() {
            return date == null && (plani == null || planifie == null);
        }

        List<AppField> fields() {
            List<AppField> list = new ArrayList<>();
            if (date != null) list.add(date);
            if (plani != null && planifie != null) list.add(plani);
            return list;
        }
    }

    private Defaults defaults() {
        AppField date = byCode(DossierProgressService.DATE_TRAITEMENT);
        AppField plani = byCode(DossierProgressService.CELLULE_PLANI);
        // the "Planifié" option as the admin wrote it (accents / case may differ)
        String planifie = plani == null ? null : plani.getOptions().stream()
                .filter(FieldOption::isActive)
                .map(FieldOption::getValue)
                .filter(v -> TextUtils.normalize(v).equals("planifie"))
                .findFirst().orElse(null);
        return new Defaults(date, plani, planifie);
    }

    private AppField byCode(String code) {
        return fieldRepository.findAllWithOptions().stream()
                .filter(f -> f.getCode().equals(code) && f.isActive())
                .findFirst().orElse(null);
    }

    private int fill(Collection<Dossier> dossiers, Defaults defaults, Function<Dossier, LocalDate> dateOf) {
        Set<String> present = new HashSet<>();
        List<Long> ids = dossiers.stream().map(Dossier::getId).filter(Objects::nonNull).toList();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            for (DossierFieldValue v : valueRepository.findByDossierIds(ids.subList(i, Math.min(i + CHUNK, ids.size())))) {
                present.add(v.getDossier().getId() + ":" + v.getField().getId());
            }
        }
        LocalDateTime now = LocalDateTime.now();
        List<DossierFieldValue> toSave = new ArrayList<>();
        for (Dossier d : dossiers) {
            if (d.getId() == null) {
                continue;
            }
            if (defaults.date() != null && present.add(d.getId() + ":" + defaults.date().getId())) {
                toSave.add(value(d, defaults.date(), dateOf.apply(d).toString(), now));
            }
            if (defaults.plani() != null && defaults.planifie() != null && present.add(d.getId() + ":" + defaults.plani().getId())) {
                toSave.add(value(d, defaults.plani(), defaults.planifie(), now));
            }
        }
        valueRepository.saveAll(toSave);
        valueRepository.flush();
        return toSave.size();
    }

    private static DossierFieldValue value(Dossier d, AppField f, String value, LocalDateTime now) {
        return DossierFieldValue.builder().dossier(d).field(f).value(value)
                .updatedBy(DossierProgressService.DEFAULT_ACTOR).updatedAt(now).build();
    }
}
