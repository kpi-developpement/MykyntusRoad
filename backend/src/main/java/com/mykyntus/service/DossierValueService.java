package com.mykyntus.service;

import com.mykyntus.dto.dossier.FieldValueResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.*;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Values entered by the users in the application columns.
 * Every change is recorded in the dossier life cycle; when a value is set, the empty USER columns
 * (and the empty DATE columns other than the "Date de traitement", given by the import) of the same
 * section are filled automatically.
 */
@Service
@RequiredArgsConstructor
public class DossierValueService {

    private final DossierRepository dossierRepository;
    private final AppFieldRepository fieldRepository;
    private final FieldOptionRepository optionRepository;
    private final DossierFieldValueRepository valueRepository;
    private final DossierEventRepository eventRepository;
    private final AppUserRepository userRepository;
    private final DossierProgressService progressService;
    private final WorkerService workerService;

    /** Detail of the first value entered over an import default (not counted as a modification). */
    public static final String DEFAULT_REPLACED = "Remplace la valeur par défaut";

    @Transactional
    public FieldValueResponse updateValue(Long dossierId, Long fieldId, String rawValue, CurrentUser user) {
        Dossier dossier = dossierRepository.findById(dossierId).orElseThrow(() -> ApiException.notFound("Dossier introuvable"));
        AppField field = fieldRepository.findById(fieldId).orElseThrow(() -> ApiException.notFound("Champ introuvable"));

        FieldSection section = field.getSection();
        if (!user.role().canEdit(section)) {
            throw ApiException.forbidden("Vous ne pouvez pas modifier la section " + section.getLabel());
        }
        workerService.requireWorking(dossier, user);
        if (!field.isActive()) {
            throw ApiException.badRequest("Ce champ est désactivé");
        }
        if (DossierProgressService.isAuto(field)) {
            throw ApiException.badRequest("« " + field.getLabel() + " » est rempli automatiquement");
        }
        if (!DossierProgressService.available(field, dossier)) {
            throw ApiException.badRequest("« " + field.getLabel() + " » s'ouvre quand la Cellule plani passe à « Ouvert »");
        }
        String value = TextUtils.trimToNull(rawValue);
        validate(field, value);

        String actor = displayName(user);
        Optional<DossierFieldValue> existing = valueRepository.findByDossierIdAndFieldId(dossierId, fieldId);
        String old = existing.map(DossierFieldValue::getValue).orElse(null);

        Map<Long, String> autoFilled = new LinkedHashMap<>();
        if (!Objects.equals(old, value)) {
            boolean replacesDefault = existing.map(v -> DossierProgressService.DEFAULT_ACTOR.equals(v.getUpdatedBy())).orElse(false);
            write(dossier, field, existing, value, user.username());
            record(dossier, field, section, old, value, actor, replacesDefault ? DEFAULT_REPLACED : null);
            if (value != null) {
                autoFill(dossier, field, section, user.username(), actor, autoFilled);
            }
            valueRepository.flush();
            progressService.refresh(dossier);
        }
        LocalDateTime now = LocalDateTime.now();
        return new FieldValueResponse(dossierId, fieldId, value, value == null ? null : user.username(), now, autoFilled,
                dossier.isRoutedPlanif());
    }

    private void validate(AppField field, String value) {
        if (value == null) {
            return;
        }
        if (field.getType() == FieldType.SELECT && !optionRepository.existsByFieldIdAndValueIgnoreCaseAndActiveTrue(field.getId(), value)) {
            throw ApiException.badRequest("Valeur non autorisée pour " + field.getLabel() + " : " + value);
        }
        if (field.getType() == FieldType.DATE) {
            try {
                LocalDate.parse(value);
            } catch (DateTimeParseException e) {
                throw ApiException.badRequest("Date invalide pour " + field.getLabel() + " (format attendu : AAAA-MM-JJ)");
            }
        }
    }

    /** Fills the empty DATE (today) and USER (current user) columns of the same section. */
    private void autoFill(Dossier dossier, AppField changed, FieldSection section, String username, String actor, Map<Long, String> autoFilled) {
        for (AppField f : fieldRepository.findAll()) {
            boolean auto = (f.getType() == FieldType.DATE && !DossierProgressService.DATE_TRAITEMENT.equals(f.getCode()))
                    || f.getType() == FieldType.USER;
            if (!auto || !f.isActive() || f.getSection() != section || f.getId().equals(changed.getId())
                    || !DossierProgressService.available(f, dossier)) {
                continue;
            }
            Optional<DossierFieldValue> current = valueRepository.findByDossierIdAndFieldId(dossier.getId(), f.getId());
            if (current.isPresent()) {
                continue;
            }
            String value = f.getType() == FieldType.DATE ? LocalDate.now().toString() : actor;
            write(dossier, f, current, value, username);
            record(dossier, f, section, null, value, actor, "Rempli automatiquement");
            autoFilled.put(f.getId(), value);
        }
    }

    private void write(Dossier dossier, AppField field, Optional<DossierFieldValue> existing, String value, String username) {
        if (value == null) {
            existing.ifPresent(valueRepository::delete);
            return;
        }
        DossierFieldValue entity = existing.orElseGet(() -> DossierFieldValue.builder().dossier(dossier).field(field).build());
        entity.setValue(value);
        entity.setUpdatedBy(username);
        entity.setUpdatedAt(LocalDateTime.now());
        valueRepository.save(entity);
    }

    private void record(Dossier dossier, AppField field, FieldSection section, String old, String value, String actor, String detail) {
        eventRepository.save(DossierEvent.builder()
                .dossier(dossier)
                .type(value == null ? EventType.VALUE_CLEARED : EventType.VALUE_SET)
                .section(section)
                .fieldLabel(field.getLabel())
                .oldValue(old)
                .newValue(value)
                .actor(actor)
                .detail(detail)
                .build());
    }

    private String displayName(CurrentUser user) {
        return userRepository.findByUsername(user.username())
                .map(u -> u.getFullName() != null ? u.getFullName() : u.getUsername())
                .orElse(user.username());
    }
}
