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

    @Transactional(readOnly = true)
    public byte[] export(ExportRequest request) {
        DossierSearchRequest criteria = request.criteria() == null ? DossierSearchRequest.empty() : request.criteria();
        List<ExportRequest.Column> columns = request.columns() == null || request.columns().isEmpty()
                ? defaultColumns() : request.columns();
        columns.forEach(c -> ColumnKey.parse(c.key()));

        List<Long> ids = searchRepository.ids(criteria, MAX_ROWS);
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
                for (Long id : chunk) {
                    Dossier d = dossiers.get(id);
                    if (d == null) {
                        continue;
                    }
                    Row row = sheet.createRow(r++);
                    for (int c = 0; c < columns.size(); c++) {
                        String value = value(d, values.getOrDefault(id, Map.of()), columns.get(c).key());
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

    private String value(Dossier d, Map<Long, String> values, String key) {
        return switch (ColumnKey.parse(key)) {
            case ColumnKey.DateKey ignored -> d.getDossierDate() == null ? null : d.getDossierDate().format(DATE);
            case ColumnKey.IdKey ignored -> d.getIdExterne();
            case ColumnKey.FlagsKey ignored -> String.join(", ", FlagService.decode(d.getFlags()));
            case ColumnKey.AssigneeKey ignored -> d.getAssignedTo();
            case ColumnKey.RawKey(String column) -> d.getRawData().get(column);
            case ColumnKey.FieldKey(Long fieldId) -> values.get(fieldId);
        };
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
