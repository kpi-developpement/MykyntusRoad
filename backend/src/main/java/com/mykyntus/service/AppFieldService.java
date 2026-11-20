package com.mykyntus.service;

import com.mykyntus.dto.field.AppFieldRequest;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.field.FieldOptionRequest;
import com.mykyntus.dto.field.FieldOptionResponse;
import com.mykyntus.entity.AppField;
import com.mykyntus.entity.FieldOption;
import com.mykyntus.entity.FieldSection;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.exception.ApiException;
import com.mykyntus.mapper.DtoMapper;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.DossierFieldValueRepository;
import com.mykyntus.repository.FieldOptionRepository;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/** Admin management of the application columns and of their dropdown values. */
@Service
@RequiredArgsConstructor
public class AppFieldService {

    /** J-1, then J, then J+1; inside a section by position. */
    public static final Comparator<AppField> DISPLAY_ORDER = Comparator
            .comparing((AppField f) -> f.getSection().ordinal())
            .thenComparingInt(AppField::getPosition)
            .thenComparing(AppField::getId);

    private final AppFieldRepository fieldRepository;
    private final FieldOptionRepository optionRepository;
    private final DossierFieldValueRepository valueRepository;

    @Transactional(readOnly = true)
    public List<AppFieldResponse> findAll() {
        return fieldRepository.findAllWithOptions().stream()
                .sorted(DISPLAY_ORDER)
                .map(f -> DtoMapper.toField(f, false))
                .toList();
    }

    @Transactional
    public AppFieldResponse create(AppFieldRequest request, CurrentUser user) {
        checkConfigure(request.section(), user);
        AppField field = AppField.builder()
                .code(uniqueCode(request.section().name().toLowerCase() + "_" + TextUtils.slug(request.label())))
                .label(request.label().trim())
                .section(request.section())
                .type(request.type())
                .position(request.position() != null ? request.position()
                        : fieldRepository.findMaxPosition(request.section()) + 1)
                .active(request.active() == null || request.active())
                .published(Boolean.TRUE.equals(request.published()))
                .build();
        return DtoMapper.toField(fieldRepository.save(field), false);
    }

    @Transactional
    public AppFieldResponse update(Long id, AppFieldRequest request, CurrentUser user) {
        AppField field = getField(id, user);
        checkConfigure(request.section(), user);
        field.setLabel(request.label().trim());
        field.setSection(request.section());
        field.setType(request.type());
        if (request.position() != null) {
            field.setPosition(request.position());
        }
        if (request.active() != null) {
            field.setActive(request.active());
        }
        if (request.published() != null) {
            field.setPublished(request.published());
        }
        return DtoMapper.toField(field, false);
    }

    @Transactional
    public void delete(Long id, CurrentUser user) {
        AppField field = getField(id, user);
        valueRepository.deleteByFieldId(id);
        fieldRepository.delete(field);
    }

    @Transactional
    public FieldOptionResponse addOption(Long fieldId, FieldOptionRequest request, CurrentUser user) {
        AppField field = getField(fieldId, user);
        String value = request.value().trim();
        if (optionRepository.existsByFieldIdAndValueIgnoreCase(fieldId, value)) {
            throw ApiException.conflict("La valeur \"" + value + "\" existe déjà");
        }
        int position = request.position() != null ? request.position()
                : field.getOptions().stream().mapToInt(FieldOption::getPosition).max().orElse(0) + 1;
        FieldOption option = FieldOption.builder()
                .field(field)
                .value(value)
                .position(position)
                .active(request.active() == null || request.active())
                .build();
        field.getOptions().add(option);
        return DtoMapper.toOption(optionRepository.save(option));
    }

    @Transactional
    public FieldOptionResponse updateOption(Long fieldId, Long optionId, FieldOptionRequest request, CurrentUser user) {
        FieldOption option = getOption(fieldId, optionId, user);
        String value = request.value().trim();
        if (optionRepository.existsByFieldIdAndValueIgnoreCaseAndIdNot(fieldId, value, optionId)) {
            throw ApiException.conflict("La valeur \"" + value + "\" existe déjà");
        }
        option.setValue(value);
        if (request.position() != null) {
            option.setPosition(request.position());
        }
        if (request.active() != null) {
            option.setActive(request.active());
        }
        return DtoMapper.toOption(option);
    }

    @Transactional
    public void deleteOption(Long fieldId, Long optionId, CurrentUser user) {
        FieldOption option = getOption(fieldId, optionId, user);
        option.getField().getOptions().remove(option);
        optionRepository.delete(option);
    }

    /** Field that this user is allowed to configure (sécurisation columns belong to ADMIN_SECURISATION). */
    private AppField getField(Long id, CurrentUser user) {
        AppField field = fieldRepository.findById(id).orElseThrow(() -> ApiException.notFound("Champ introuvable"));
        checkConfigure(field.getSection(), user);
        return field;
    }

    private void checkConfigure(FieldSection section, CurrentUser user) {
        if (!user.role().canConfigure(section)) {
            throw ApiException.forbidden("Vous ne gérez pas les colonnes de la section " + section.getLabel());
        }
    }

    private FieldOption getOption(Long fieldId, Long optionId, CurrentUser user) {
        getField(fieldId, user);
        FieldOption option = optionRepository.findById(optionId)
                .orElseThrow(() -> ApiException.notFound("Valeur introuvable"));
        if (!option.getField().getId().equals(fieldId)) {
            throw ApiException.notFound("Valeur introuvable pour ce champ");
        }
        return option;
    }

    private String uniqueCode(String base) {
        String code = base.length() > 70 ? base.substring(0, 70) : base;
        String candidate = code;
        int i = 2;
        while (fieldRepository.existsByCode(candidate)) {
            candidate = code + "_" + i++;
        }
        return candidate;
    }
}
