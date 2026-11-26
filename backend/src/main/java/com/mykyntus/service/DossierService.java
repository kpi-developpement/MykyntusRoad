package com.mykyntus.service;

import com.mykyntus.dto.common.PageResponse;
import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.importing.SourceColumnResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.mapper.DtoMapper;
import com.mykyntus.repository.*;
import com.mykyntus.repository.search.ColumnKey;
import com.mykyntus.repository.search.DossierSearchRepository;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DossierService {

    private final DossierRepository dossierRepository;
    private final DossierSearchRepository searchRepository;
    private final DossierFieldValueRepository valueRepository;
    private final AppFieldRepository fieldRepository;
    private final FieldOptionRepository optionRepository;
    private final SourceColumnRepository sourceColumnRepository;
    private final WorkerService workerService;
    private final AppUserRepository userRepository;

    /** Table page: dynamic columns, application fields and the matching dossiers. */
    @Transactional(readOnly = true)
    public DossierTableResponse search(DossierSearchRequest request) {
        validateKeys(request);
        Page<Dossier> result = searchRepository.search(request);

        List<Long> ids = result.getContent().stream().map(Dossier::getId).toList();
        Map<Long, Map<Long, String>> valuesByDossier = new HashMap<>();
        if (!ids.isEmpty()) {
            for (DossierFieldValue v : valueRepository.findByDossierIds(ids)) {
                valuesByDossier.computeIfAbsent(v.getDossier().getId(), k -> new HashMap<>())
                        .put(v.getField().getId(), v.getValue());
            }
        }

        Map<Long, Map<String, List<String>>> joined = workerService.joined(result.getContent());
        Long etatFinal = fieldRepository.findAll().stream()
                .filter(f -> f.isActive() && DossierProgressService.ETAT_FINAL.equals(f.getCode()))
                .map(AppField::getId).findFirst().orElse(null);
        LocalDate today = LocalDate.now();

        List<DossierRowResponse> rows = result.getContent().stream()
                .map(d -> {
                    Map<Long, String> values = valuesByDossier.getOrDefault(d.getId(), Map.of());
                    String alert = etatFinal == null ? null : DossierProgressService.secuAlert(d, values.get(etatFinal), today);
                    return new DossierRowResponse(d.getId(), d.getIdExterne(), d.getDossierDate(),
                            new LinkedHashMap<>(d.getRawData()), values,
                            FlagService.decode(d.getFlags()), d.isFlagsManual(), d.getAssignedTo(),
                            d.getAssignedJ(), joined.getOrDefault(d.getId(), Map.of()), d.isRoutedPlanif(), d.isHorsSecu(),
                            DossierProgressService.delay(d).name(), alert);
                })
                .toList();

        List<SourceColumnResponse> columns = sourceColumnRepository.findByVisibleTrueOrderByPositionAsc()
                .stream().map(DtoMapper::toSourceColumn).toList();

        return new DossierTableResponse(columns, activeFields(), new PageResponse<>(rows, result.getNumber(),
                result.getSize(), result.getTotalElements(), result.getTotalPages()), searchRepository.openCount(request),
                names(rows));
    }

    /** Distinct values of one column, for the column filter. */
    @Transactional(readOnly = true)
    public FacetResponse facets(FacetRequest request) {
        DossierSearchRequest criteria = request.criteriaOrEmpty();
        validateKeys(criteria);
        DossierSearchRepository.FacetResult result = searchRepository.facets(
                criteria, request.key(), request.q(), request.limitOrDefault());
        return new FacetResponse(request.key(), result.values(), result.emptyCount(), result.truncated());
    }

    /** Counters: total and dossiers "treated" (at least one value) per section. */
    @Transactional(readOnly = true)
    public DossierStatsResponse stats(DossierSearchRequest request) {
        validateKeys(request);
        long total = searchRepository.count(request);
        Map<FieldSection, Long> treated = searchRepository.treatedBySection(request);
        Map<FieldSection, Long> done = searchRepository.doneBySection(request);
        Map<FieldSection, Long> fieldCount = fieldRepository.findAll().stream()
                .filter(AppField::isActive)
                .collect(Collectors.groupingBy(AppField::getSection, Collectors.counting()));

        List<DossierStatsResponse.SectionStat> sections = Arrays.stream(FieldSection.values())
                .map(s -> new DossierStatsResponse.SectionStat(s, s.getLabel(),
                        treated.getOrDefault(s, 0L), fieldCount.getOrDefault(s, 0L), done.getOrDefault(s, 0L)))
                .toList();
        return new DossierStatsResponse(total, sections, searchRepository.secuPendingCount(request));
    }

    /** Display names of the pilots shown in the rows. */
    private Map<String, String> names(List<DossierRowResponse> rows) {
        Set<String> usernames = new HashSet<>();
        for (DossierRowResponse r : rows) {
            if (r.assignedTo() != null) usernames.add(r.assignedTo());
            if (r.assignedJ() != null) usernames.add(r.assignedJ());
            r.workers().values().forEach(usernames::addAll);
        }
        Map<String, String> names = new HashMap<>();
        if (!usernames.isEmpty()) {
            userRepository.findAll().stream()
                    .filter(u -> usernames.contains(u.getUsername()))
                    .forEach(u -> names.put(u.getUsername(), PiloteService.displayName(u)));
        }
        return names;
    }

    private List<AppFieldResponse> activeFields() {
        return fieldRepository.findAllWithOptions().stream()
                .filter(AppField::isActive)
                .sorted(AppFieldService.DISPLAY_ORDER)
                .map(f -> DtoMapper.toField(f, true))
                .toList();
    }

    /** Fails fast (400) on an unknown column key instead of a SQL error. */
    private void validateKeys(DossierSearchRequest request) {
        request.filtersOrEmpty().stream()
                .filter(Objects::nonNull)
                .forEach(f -> ColumnKey.parse(f.key()));
        if (request.sort() != null && request.sort().key() != null && !request.sort().key().isBlank()) {
            ColumnKey.parse(request.sort().key());
        }
    }
}
