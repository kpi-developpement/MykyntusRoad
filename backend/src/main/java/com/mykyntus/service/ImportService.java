package com.mykyntus.service;

import com.mykyntus.dto.importing.ImportBatchResponse;
import com.mykyntus.dto.importing.ImportResultResponse;
import com.mykyntus.dto.importing.SecSourceResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.mapper.DtoMapper;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.repository.ImportBatchRepository;
import com.mykyntus.repository.SourceColumnRepository;
import com.mykyntus.service.excel.ExcelParser;
import com.mykyntus.service.excel.ParsedSheet;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Imports the main daily file and the 3 sécurisation files.
 * Every row becomes (or updates) a dossier identified by its ID Externe; values entered in the
 * application are never touched. Each creation / change is recorded in the dossier life cycle.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportService {

    private static final int CHUNK_SIZE = 1000;
    private static final int MAX_DETAIL_LINES = 8;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("xlsx", "xls", "xlsm");
    private static final List<DataSource> SEC_SOURCES = List.of(DataSource.SEC_GLOBAL, DataSource.SEC_1, DataSource.SEC_2, DataSource.SEC_3);

    private final ExcelParser excelParser;
    private final DossierRepository dossierRepository;
    private final DossierEventRepository eventRepository;
    private final ImportBatchRepository batchRepository;
    private final SourceColumnRepository sourceColumnRepository;
    private final FlagService flagService;
    private final SecuCrossCheckService crossCheckService;
    private final DossierProgressService progressService;
    private final ImportDefaultsService defaultsService;
    private final com.mykyntus.repository.ImportRowRepository importRowRepository;

    /** Main daily file. @param forcedDate optional date applied to every dossier of the file */
    @Transactional
    public ImportResultResponse importMain(MultipartFile file, LocalDate forcedDate, String username) {
        return importFile(file, DataSource.MAIN, forcedDate, username);
    }

    /**
     * Sécurisation file 1, 2 or 3 (columns stored apart, "S1::...") or the global file (slot 0, "G::..."):
     * the global file holds every dossier of the day with the flag columns.
     *
     * @param forcedDate optional date applied to the dossiers (global file only)
     */
    @Transactional
    public ImportResultResponse importSecurisation(int slot, MultipartFile file, LocalDate forcedDate, String username) {
        if (slot < 0 || slot > 3) {
            throw ApiException.badRequest("Fichier sécurisation inconnu : " + slot);
        }
        return importFile(file, DataSource.secSlot(slot), slot == 0 ? forcedDate : null, username);
    }

    @Transactional(readOnly = true)
    public List<ImportBatchResponse> mainHistory() {
        return batchRepository.findMainHistory(PageRequest.of(0, 50)).stream().map(DtoMapper::toBatch).toList();
    }

    @Transactional(readOnly = true)
    public List<ImportBatchResponse> securisationHistory() {
        return batchRepository.findHistory(SEC_SOURCES, PageRequest.of(0, 50)).stream().map(DtoMapper::toBatch).toList();
    }

    /** State of the sécurisation file slots: 0 = global file, 1..3 = sécurisation files. */
    @Transactional(readOnly = true)
    public List<SecSourceResponse> securisationSources() {
        Map<DataSource, List<SourceColumn>> columns = sourceColumnRepository.findAll().stream()
                .collect(Collectors.groupingBy(c -> DataSource.orMain(c.getSource())));
        List<SecSourceResponse> result = new ArrayList<>();
        for (int slot = 0; slot <= 3; slot++) {
            DataSource source = DataSource.secSlot(slot);
            List<SourceColumn> list = columns.getOrDefault(source, List.of());
            ImportBatchResponse last = batchRepository.findHistory(List.of(source), PageRequest.of(0, 1)).stream()
                    .findFirst().map(DtoMapper::toBatch).orElse(null);
            result.add(new SecSourceResponse(slot, source, last, list.size(), list.stream().filter(SourceColumn::isVisible).count()));
        }
        return result;
    }

    // ------------------------------------------------------------------ import

    private ImportResultResponse importFile(MultipartFile file, DataSource source, LocalDate forcedDate, String username) {
        validateFile(file);
        ParsedSheet sheet;
        try (InputStream in = file.getInputStream()) {
            sheet = excelParser.parse(in);
        } catch (IOException e) {
            throw ApiException.badRequest("Impossible de lire le fichier");
        }

        // the identifier of a sécurisation file is the dossier itself, not a data column
        List<String> headers = source == DataSource.MAIN ? sheet.headers()
                : sheet.headers().stream().filter(h -> !h.equals(sheet.idHeader())).toList();
        List<String> warnings = new ArrayList<>(sheet.warnings());
        List<String> newColumns = registerColumns(headers, source);

        Map<String, ParsedSheet.ParsedRow> rowsById = new LinkedHashMap<>();
        int skipped = 0;
        for (ParsedSheet.ParsedRow row : sheet.rows()) {
            String id = TextUtils.trimToNull(row.idExterne());
            if (id == null) {
                skipped++;
                warnings.add("Ligne " + row.lineNumber() + " ignorée : identifiant vide");
                continue;
            }
            if (rowsById.put(id, row) != null) {
                warnings.add("Identifiant en double dans le fichier : " + id + " (dernière ligne conservée)");
            }
        }

        String fileName = Objects.requireNonNullElse(file.getOriginalFilename(), "fichier");
        ImportBatch batch = batchRepository.save(ImportBatch.builder()
                .fileName(fileName)
                .importedBy(username)
                .source(source)
                .build());

        int created = 0;
        int updated = 0;
        LocalDate today = LocalDate.now();
        List<String> ids = new ArrayList<>(rowsById.keySet());

        for (int i = 0; i < ids.size(); i += CHUNK_SIZE) {
            List<String> chunk = ids.subList(i, Math.min(i + CHUNK_SIZE, ids.size()));
            Map<String, Dossier> existing = dossierRepository.findByIdExterneIn(chunk).stream()
                    .collect(Collectors.toMap(Dossier::getIdExterne, Function.identity()));

            List<Dossier> toSave = new ArrayList<>(chunk.size());
            List<Change> changes = new ArrayList<>(chunk.size());
            List<ImportRow> importRows = new ArrayList<>(chunk.size());
            for (String id : chunk) {
                ParsedSheet.ParsedRow row = rowsById.get(id);
                LocalDate date = forcedDate != null ? forcedDate : row.date();
                Dossier dossier = existing.get(id);
                boolean isNew = dossier == null;
                LocalDate previousDate = null;
                if (isNew) {
                    dossier = Dossier.builder().idExterne(id).dossierDate(date != null ? date : today).build();
                    created++;
                } else {
                    // only the main file (or a date forced on the global file) decides the dossier date
                    if ((source == DataSource.MAIN || (source == DataSource.SEC_GLOBAL && forcedDate != null)) && date != null) {
                        if (!date.equals(dossier.getDossierDate())) {
                            previousDate = dossier.getDossierDate();
                        }
                        dossier.setDossierDate(date);
                    }
                    dossier.setUpdatedAt(LocalDateTime.now());
                    updated++;
                }
                Map<String, String> values = new LinkedHashMap<>(row.values());
                headers.stream().filter(h -> !values.containsKey(h)).forEach(h -> values.put(h, null));
                values.keySet().retainAll(headers);
                Diff diff = applyValues(dossier.getRawData(), source.getPrefix(), values);
                flagService.applyAutomatic(dossier);
                dossier.setCancelled(null);
                dossier.setLastImport(batch);
                toSave.add(dossier);
                changes.add(new Change(dossier, isNew, diff.lines(), diff.modified()));
                importRows.add(ImportRow.builder().batch(batch).dossier(dossier).created(isNew)
                        .previousDate(previousDate).previous(isNew ? null : ImportRow.encode(diff.previous())).build());
            }
            dossierRepository.saveAll(toSave);
            importRowRepository.saveAll(importRows);
            // ready for everyone: date de traitement = import date, Cellule plani = "Planifié"
            defaultsService.apply(toSave, today);
            // admin's file crossed with the sécurisation files (N/A when absent), then closed / routed state
            crossCheckService.check(toSave, source);
            progressService.refresh(toSave);
            eventRepository.saveAll(changes.stream()
                    .map(c -> importEvent(c, source, fileName, username))
                    .filter(Objects::nonNull)
                    .toList());
        }

        batch.setTotalRows(sheet.rows().size());
        batch.setCreatedRows(created);
        batch.setUpdatedRows(updated);
        batch.setSkippedRows(skipped);
        log.info("Import {} ({}) by {} : {} created, {} updated, {} skipped", fileName, source, username, created, updated, skipped);

        return new ImportResultResponse(batch.getId(), fileName, batch.getTotalRows(), created, updated, skipped,
                headers, newColumns, warnings);
    }

    /** @param modified true when a value already present was changed (not only added) */
    private record Change(Dossier dossier, boolean created, List<String> diff, boolean modified) {
    }

    /** @param previous replaced values: key -> old value (null = absent before) */
    private record Diff(List<String> lines, boolean modified, Map<String, String> previous) {
    }

    /** Writes the file values in the dossier data; returns "Column : old → new" for every change. */
    private Diff applyValues(Map<String, String> raw, String prefix, Map<String, String> values) {
        List<String> lines = new ArrayList<>();
        Map<String, String> previous = new LinkedHashMap<>();
        boolean modified = false;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            String key = prefix + entry.getKey();
            String value = entry.getValue();
            String old = raw.get(key);
            if (Objects.equals(old, value)) {
                continue;
            }
            previous.put(key, old);
            if (value == null) {
                raw.remove(key);
            } else {
                raw.put(key, value);
            }
            modified |= old != null;
            lines.add(entry.getKey() + " : " + (old == null ? "(vide)" : old) + " → " + (value == null ? "(vide)" : value));
        }
        return new Diff(lines, modified, previous);
    }

    private DossierEvent importEvent(Change change, DataSource source, String fileName, String username) {
        String origin = switch (source) {
            case MAIN -> "l'import « " + fileName + " »";
            case SEC_GLOBAL -> "le fichier global sécurisation « " + fileName + " »";
            default -> "le fichier sécurisation " + source.name().substring(4) + " « " + fileName + " »";
        };
        EventType type;
        String detail;
        if (change.created()) {
            type = EventType.CREATED;
            detail = "Dossier créé par " + origin;
        } else if (!change.diff().isEmpty()) {
            // only a change of a value already present counts as a modification
            type = change.modified() ? EventType.IMPORT_UPDATED : EventType.DATA_RECEIVED;
            List<String> lines = change.diff();
            String shown = String.join("\n", lines.subList(0, Math.min(lines.size(), MAX_DETAIL_LINES)));
            String more = lines.size() > MAX_DETAIL_LINES ? "\n… et " + (lines.size() - MAX_DETAIL_LINES) + " autre(s)" : "";
            String verb = change.modified() ? " donnée(s) modifiée(s) par " : " donnée(s) reçue(s) de ";
            detail = lines.size() + verb + origin + "\n" + shown + more;
        } else {
            return null;
        }
        return DossierEvent.builder().dossier(change.dossier()).type(type).detail(detail).actor(username).build();
    }

    /** Adds the headers never seen before for this source, keeping the file order. Returns the new ones. */
    private List<String> registerColumns(List<String> headers, DataSource source) {
        Set<String> known = sourceColumnRepository.findAll().stream().map(SourceColumn::getName).collect(Collectors.toSet());
        int position = sourceColumnRepository.findMaxPosition();
        List<String> added = new ArrayList<>();
        for (String header : headers) {
            String key = source.getPrefix() + header;
            if (known.add(key)) {
                boolean idColumn = source == DataSource.MAIN && TextUtils.normalize(header).equals(ExcelParser.ID_EXTERNE_HEADER);
                sourceColumnRepository.save(SourceColumn.builder()
                        .name(key)
                        .label(header)
                        .source(source)
                        .position(idColumn ? 0 : ++position)
                        .build());
                added.add(header);
            }
        }
        return added;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Aucun fichier reçu");
        }
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "");
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw ApiException.badRequest("Format non supporté. Formats acceptés : .xlsx, .xls");
        }
    }
}
