package com.mykyntus.service;

import com.mykyntus.entity.AppField;
import com.mykyntus.entity.DataSource;
import com.mykyntus.entity.Dossier;
import com.mykyntus.entity.DossierEvent;
import com.mykyntus.entity.DossierFieldValue;
import com.mykyntus.entity.EventType;
import com.mykyntus.entity.FieldSection;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierFieldValueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Cross-check of the admin's file with the sécurisation files (same EPS = same dossier, so the values
 * of the sécurisation team are already on it). A dossier of the admin's file that is in no sécurisation
 * file gets "NA" / "N/A" in "Etat final" and "Commentaire de traitement"; if it shows up later in a
 * sécurisation file, these automatic values are removed.
 */
@Service
@RequiredArgsConstructor
public class SecuCrossCheckService {

    /** Author of the automatic values (lets them be told apart from a value chosen by a pilot). */
    public static final String SYSTEM = "system";
    public static final String ACTOR = "Système";
    private static final Map<String, String> NA_VALUES = Map.of(
            DossierProgressService.ETAT_FINAL, "NA",
            DossierProgressService.COMMENTAIRE_SECU, "N/A");
    private static final List<String> SEC_PREFIXES = List.of(
            DataSource.SEC_GLOBAL.getPrefix(), DataSource.SEC_1.getPrefix(), DataSource.SEC_2.getPrefix(), DataSource.SEC_3.getPrefix());

    private final AppFieldRepository fieldRepository;
    private final DossierFieldValueRepository valueRepository;
    private final DossierEventRepository eventRepository;
    private final DossierProgressService progressService;

    /** Dossier received in a sécurisation file (global or 1..3). */
    public static boolean inSecurisation(Dossier d) {
        return d.getRawData().keySet().stream().anyMatch(k -> SEC_PREFIXES.stream().anyMatch(k::startsWith));
    }

    /** After an import: marks / unmarks the dossiers absent from the sécurisation files. */
    @Transactional
    public void check(List<Dossier> dossiers, DataSource source) {
        List<AppField> fields = fieldRepository.findAll().stream()
                .filter(f -> NA_VALUES.containsKey(f.getCode()) && f.isActive())
                .toList();
        if (dossiers.isEmpty() || fields.isEmpty()) {
            return;
        }
        Map<Long, Map<Long, DossierFieldValue>> values = new HashMap<>();
        for (DossierFieldValue v : valueRepository.findByDossierIds(dossiers.stream().map(Dossier::getId).toList())) {
            values.computeIfAbsent(v.getDossier().getId(), k -> new HashMap<>()).put(v.getField().getId(), v);
        }
        List<DossierEvent> events = new ArrayList<>();
        List<Dossier> changed = new ArrayList<>();
        for (Dossier d : dossiers) {
            boolean absent = source == DataSource.MAIN && !inSecurisation(d);
            Map<Long, DossierFieldValue> current = values.getOrDefault(d.getId(), Map.of());
            if (absent && !d.isHorsSecu()) {
                d.setHorsSecu(true);
                for (AppField f : fields) {
                    if (current.containsKey(f.getId())) {
                        continue;
                    }
                    String value = NA_VALUES.get(f.getCode());
                    valueRepository.save(DossierFieldValue.builder().dossier(d).field(f).value(value)
                            .updatedBy(SYSTEM).updatedAt(LocalDateTime.now()).build());
                    events.add(event(d, f, EventType.VALUE_SET, null, value, "Absent des fichiers sécurisation"));
                }
                changed.add(d);
            } else if (!absent && d.isHorsSecu() && inSecurisation(d)) {
                d.setHorsSecu(false);
                for (AppField f : fields) {
                    DossierFieldValue v = current.get(f.getId());
                    if (v != null && SYSTEM.equals(v.getUpdatedBy()) && Objects.equals(v.getValue(), NA_VALUES.get(f.getCode()))) {
                        valueRepository.delete(v);
                        events.add(event(d, f, EventType.VALUE_CLEARED, v.getValue(), null, "Dossier reçu dans un fichier sécurisation"));
                    }
                }
                changed.add(d);
            } else if (d.getHorsSecu() == null) {
                d.setHorsSecu(absent);
            }
        }
        eventRepository.saveAll(events);
        valueRepository.flush();
        progressService.refresh(changed);
    }

    private static DossierEvent event(Dossier d, AppField f, EventType type, String old, String value, String detail) {
        return DossierEvent.builder()
                .dossier(d)
                .type(type)
                .section(FieldSection.SECURISATION)
                .fieldLabel(f.getLabel())
                .oldValue(old)
                .newValue(value)
                .detail(detail)
                .actor(ACTOR)
                .build();
    }
}
