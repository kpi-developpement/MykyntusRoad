package com.mykyntus.service;

import com.mykyntus.dto.dossier.DossierSearchRequest;
import com.mykyntus.dto.dossier.ExportRequest;
import com.mykyntus.entity.Dossier;
import com.mykyntus.entity.DossierFieldValue;
import com.mykyntus.entity.SourceColumn;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.DossierFieldValueRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.repository.SourceColumnRepository;
import com.mykyntus.repository.search.ColumnKey;
import com.mykyntus.repository.search.DossierSearchRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Excel export of the dossier table: every matching dossier, the chosen columns, flags included. */
@Service
@RequiredArgsConstructor
public class ExportService {

    private static final int MAX_ROWS = 200_000;
    private static final int CHUNK = 500;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final DossierSearchRepository searchRepository;
    private final DossierRepository dossierRepository;
    private final DossierFieldValueRepository valueRepository;
    private final SourceColumnRepository sourceColumnRepository;
    private final AppFieldRepository fieldRepository;
    private final com.mykyntus.repository.DossierWorkerRepository workerRepository;

    /** What the cells of a chunk need besides the dossier: its values, its pilots, the "Etat final" column. */
    private record Ctx(Map<Long, String> values, List<com.mykyntus.entity.DossierWorker> workers, Long etatFinalId) {
    }

    @Transactional(readOnly = true)
    public byte[] export(ExportRequest request) {
        statusRules.clear();
        DossierSearchRequest criteria = request.criteria() == null ? DossierSearchRequest.empty() : request.criteria();
        List<ExportRequest.Column> columns = request.columns() == null || request.columns().isEmpty()
                ? defaultColumns() : request.columns();
        columns.forEach(c -> ColumnKey.parse(c.key()));

        List<Long> ids = searchRepository.ids(criteria, MAX_ROWS);
        Long etatFinalId = fieldRepository.findAll().stream()
                .filter(f -> DossierProgressService.ETAT_FINAL.equals(f.getCode())).map(f -> f.getId()).findFirst().orElse(null);
        try (SXSSFWorkbook wb = new SXSSFWorkbook(200); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            SXSSFSheet sheet = wb.createSheet("Dossiers");
            CellStyle header = headerStyle(wb);

            Row head = sheet.createRow(0);
            for (int i = 0; i < columns.size(); i++) {
                Cell cell = head.createCell(i);
                cell.setCellValue(columns.get(i).label());
                cell.setCellStyle(header);
                sheet.setColumnWidth(i, Math.min(60, Math.max(12, columns.get(i).label().length() + 4)) * 256);
            }
            sheet.createFreezePane(2, 1);

            int r = 1;
            for (int i = 0; i < ids.size(); i += CHUNK) {
                List<Long> chunk = ids.subList(i, Math.min(i + CHUNK, ids.size()));
                Map<Long, Dossier> dossiers = dossierRepository.findWithRawData(chunk).stream()
                        .collect(Collectors.toMap(Dossier::getId, Function.identity()));
                Map<Long, Map<Long, String>> values = new HashMap<>();
                for (DossierFieldValue v : valueRepository.findByDossierIds(chunk)) {
                    values.computeIfAbsent(v.getDossier().getId(), k -> new HashMap<>()).put(v.getField().getId(), v.getValue());
                }
                Map<Long, List<com.mykyntus.entity.DossierWorker>> workers = workerRepository.findByDossierIds(chunk).stream()
                        .collect(Collectors.groupingBy(w -> w.getDossier().getId()));
                for (Long id : chunk) {
                    Dossier d = dossiers.get(id);
                    if (d == null) {
                        continue;
                    }
                    Row row = sheet.createRow(r++);
                    for (int c = 0; c < columns.size(); c++) {
                        Ctx ctx = new Ctx(values.getOrDefault(id, Map.of()), workers.getOrDefault(id, List.of()), etatFinalId);
                        String value = value(d, ctx, columns.get(c).key());
                        if (value != null) {
                            row.createCell(c).setCellValue(value);
                        }
                    }
                }
            }
            if (!columns.isEmpty()) {
                sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(r - 1, 0), 0, columns.size() - 1));
            }
            wb.write(out);
            wb.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.badRequest("Export impossible : " + e.getMessage());
        }
    }

    private String value(Dossier d, Ctx ctx, String key) {
        Map<Long, String> values = ctx.values();
        return switch (ColumnKey.parse(key)) {
            case ColumnKey.DateKey ignored -> d.getDossierDate() == null ? null : d.getDossierDate().format(DATE);
            case ColumnKey.IdKey ignored -> d.getIdExterne();
            case ColumnKey.FlagsKey ignored -> String.join(", ", FlagService.decode(d.getFlags()));
            case ColumnKey.AssigneeKey(com.mykyntus.entity.Team team) -> pilots(d, team, ctx.workers());
            case ColumnKey.DelayKey ignored -> switch (DossierProgressService.delay(d)) {
                case DONE -> "Clôturé";
                case ON_TIME -> "Dans les délais";
                case SOON -> "Bientôt en retard";
                case LATE -> "En retard";
                case CANCELLED -> "Annulé";
            };
            case ColumnKey.RouteKey ignored -> d.isRoutedPlanif() ? "Ouvert" : "Planifié";
            case ColumnKey.SecuKey ignored -> secuLabel(d, ctx);
            case ColumnKey.BatchKey ignored -> null;
            case ColumnKey.StatusKey(com.mykyntus.entity.FieldSection section) -> status(values, section);
            case ColumnKey.RawKey(String column) -> d.getRawData().get(column);
            case ColumnKey.FieldKey(Long fieldId) -> values.get(fieldId);
        };
    }

    /** "À sécuriser (RDV demain)" / "Non sécurisé (RDV aujourd'hui)". */
    private static String secuLabel(Dossier d, Ctx ctx) {
        String etat = ctx.etatFinalId() == null ? null : ctx.values().get(ctx.etatFinalId());
        String alert = ctx.etatFinalId() == null ? null : DossierProgressService.secuAlert(d, etat, java.time.LocalDate.now());
        if (alert == null) {
            return null;
        }
        return "J".equals(alert) ? "Non sécurisé (RDV aujourd'hui)" : "À sécuriser (RDV demain)";
    }

    /** Lead then the pilots who joined him. */
    private static String pilots(Dossier d, com.mykyntus.entity.Team team, List<com.mykyntus.entity.DossierWorker> workers) {
        List<String> names = new ArrayList<>();
        String lead = team.assignee(d);
        if (lead != null) {
            names.add(lead);
        }
        for (com.mykyntus.entity.DossierWorker w : workers) {
            if (w.getTeam() == team && !names.contains(w.getUsername())) {
                names.add(w.getUsername());
            }
        }
        return names.isEmpty() ? null : String.join(", ", names);
    }

    private final Map<com.mykyntus.entity.FieldSection, List<Long>[]> statusRules = new java.util.concurrent.ConcurrentHashMap<>();

    /** "Non touché" / "En cours" / "Traité", same rules as the table filter. */
    @SuppressWarnings("unchecked")
    private String status(Map<Long, String> values, com.mykyntus.entity.FieldSection section) {
        List<Long>[] rules = statusRules.computeIfAbsent(section,
                s -> new List[]{searchRepository.requiredFields(s), searchRepository.activeFields(s)});
        java.util.function.Predicate<Long> filled = id -> values.get(id) != null && !values.get(id).isBlank();
        if (!rules[0].isEmpty() && rules[0].stream().allMatch(filled)) {
            return "Traité";
        }
        return rules[1].stream().anyMatch(filled) ? "En cours" : "Non touché";
    }

    private List<ExportRequest.Column> defaultColumns() {
        List<ExportRequest.Column> list = new ArrayList<>();
        list.add(new ExportRequest.Column(ColumnKey.DATE, "Date"));
        list.add(new ExportRequest.Column(ColumnKey.ID_EXTERNE, "Ordre de travail: ID Externe"));
        list.add(new ExportRequest.Column(ColumnKey.FLAGS, "Drapeaux"));
        list.add(new ExportRequest.Column(ColumnKey.ASSIGNEE, "Pilote assigné"));
        for (SourceColumn c : sourceColumnRepository.findByVisibleTrueOrderByPositionAsc()) {
            list.add(new ExportRequest.Column(ColumnKey.RAW_PREFIX + c.getName(), c.getLabel() != null ? c.getLabel() : c.getName()));
        }
        fieldRepository.findAll().stream()
                .filter(f -> f.isActive())
                .sorted(AppFieldService.DISPLAY_ORDER)
                .forEach(f -> list.add(new ExportRequest.Column(ColumnKey.FIELD_PREFIX + f.getId(),
                        f.getSection().getLabel() + " · " + f.getLabel())));
        return list;
    }

    private static CellStyle headerStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }
}
