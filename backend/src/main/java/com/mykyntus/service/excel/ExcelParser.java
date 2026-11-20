package com.mykyntus.service.excel;

import com.mykyntus.exception.ApiException;
import com.mykyntus.util.TextUtils;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Reads any .xlsx / .xls file without knowing its columns in advance.
 * The only required column is "Ordre de travail: ID Externe".
 */
@Component
public class ExcelParser {

    /** Header that identifies a dossier. */
    public static final String ID_EXTERNE_HEADER = "ordre de travail: id externe";

    /** Accepted identifier headers (normalized), by priority. */
    private static final List<String> ID_HEADERS = List.of(
            ID_EXTERNE_HEADER, "id externe", "eps", "n° eps", "no eps", "numero eps", "num eps",
            "ref eps", "reference eps", "id eps", "n° dossier", "numero dossier", "dossier");

    /** Value of a dossier identifier, used when no known header is found. */
    private static final Pattern EPS_VALUE = Pattern.compile("^EPS-?[0-9]{4,}$", Pattern.CASE_INSENSITIVE);
    private static final int ID_SAMPLE_ROWS = 30;

    /** Headers used (in this order) to find the date of a dossier. */
    private static final List<String> DATE_HEADERS = List.of(
            "date",
            "debut de la fenetre d'arrivee",
            "debut planifie",
            "fin de la fenetre d'arrivee");

    private static final int MAX_HEADER_SEARCH_ROWS = 20;
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public ParsedSheet parse(InputStream inputStream) {
        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            DataFormatter formatter = new DataFormatter(Locale.FRANCE);
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

            for (Sheet sheet : workbook) {
                Optional<ParsedSheet> parsed = tryParseSheet(sheet, formatter, evaluator);
                if (parsed.isPresent()) {
                    return parsed.get();
                }
            }
            throw ApiException.badRequest("Colonne d'identifiant introuvable (\"Ordre de travail: ID Externe\", \"EPS\" ou valeurs EPS-…)");
        } catch (IOException | org.apache.poi.EmptyFileException e) {
            throw ApiException.badRequest("Fichier illisible : " + e.getMessage());
        }
    }

    private Optional<ParsedSheet> tryParseSheet(Sheet sheet, DataFormatter formatter, FormulaEvaluator evaluator) {
        HeaderMatch match = findHeader(sheet, formatter);
        if (match == null) {
            return Optional.empty();
        }
        Row headerRow = match.row();

        List<String> warnings = new ArrayList<>();
        Map<Integer, String> headersByIndex = readHeaders(headerRow, formatter, warnings);
        int idIndex = match.idColumn();
        if (!headersByIndex.containsKey(idIndex)) {
            headersByIndex.put(idIndex, "Identifiant");
        }
        Integer dateIndex = findDateIndex(headersByIndex);

        List<ParsedSheet.ParsedRow> rows = new ArrayList<>();
        for (int r = headerRow.getRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            Map<String, String> values = new LinkedHashMap<>();
            boolean empty = true;
            for (Map.Entry<Integer, String> h : headersByIndex.entrySet()) {
                String value = formatCell(row.getCell(h.getKey()), formatter, evaluator);
                values.put(h.getValue(), value);
                if (value != null) {
                    empty = false;
                }
            }
            if (empty) {
                continue;
            }
            String idExterne = values.get(headersByIndex.get(idIndex));
            LocalDate date = dateIndex == null ? null : readDate(row.getCell(dateIndex), formatter);
            rows.add(new ParsedSheet.ParsedRow(r + 1, idExterne, date, values));
        }
        return Optional.of(new ParsedSheet(new ArrayList<>(headersByIndex.values()), rows, warnings, headersByIndex.get(idIndex)));
    }

    private record HeaderMatch(Row row, int idColumn) {
    }

    /**
     * Header row + identifier column: first by a known header name (by priority),
     * otherwise the first column whose values look like dossier ids (EPS-0022050200).
     */
    private HeaderMatch findHeader(Sheet sheet, DataFormatter formatter) {
        int first = Math.max(sheet.getFirstRowNum(), 0);
        int last = Math.min(sheet.getLastRowNum(), first + MAX_HEADER_SEARCH_ROWS);
        for (String header : ID_HEADERS) {
            for (int r = first; r <= last; r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                for (Cell cell : row) {
                    if (header.equals(TextUtils.normalize(formatter.formatCellValue(cell)))) {
                        return new HeaderMatch(row, cell.getColumnIndex());
                    }
                }
            }
        }
        for (int r = first; r <= last; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            for (Cell cell : row) {
                if (looksLikeIdColumn(sheet, r, cell.getColumnIndex(), formatter)) {
                    return new HeaderMatch(row, cell.getColumnIndex());
                }
            }
        }
        return null;
    }

    private boolean looksLikeIdColumn(Sheet sheet, int headerRow, int column, DataFormatter formatter) {
        int filled = 0;
        int matches = 0;
        int last = Math.min(sheet.getLastRowNum(), headerRow + ID_SAMPLE_ROWS);
        for (int r = headerRow + 1; r <= last; r++) {
            Row row = sheet.getRow(r);
            String value = row == null ? null : TextUtils.trimToNull(formatter.formatCellValue(row.getCell(column)));
            if (value != null) {
                filled++;
                if (EPS_VALUE.matcher(value).matches()) {
                    matches++;
                }
            }
        }
        return matches >= 2 && matches * 10 >= filled * 6;
    }

    private Map<Integer, String> readHeaders(Row headerRow, DataFormatter formatter, List<String> warnings) {
        Map<Integer, String> headers = new LinkedHashMap<>();
        Set<String> used = new HashSet<>();
        for (Cell cell : headerRow) {
            String name = TextUtils.trimToNull(formatter.formatCellValue(cell));
            if (name == null) {
                continue;
            }
            String unique = name;
            int i = 2;
            while (!used.add(TextUtils.normalize(unique))) {
                unique = name + " (" + i++ + ")";
            }
            if (!unique.equals(name)) {
                warnings.add("Colonne en double renommée : " + unique);
            }
            headers.put(cell.getColumnIndex(), unique);
        }
        return headers;
    }


    private Integer findDateIndex(Map<Integer, String> headers) {
        for (String candidate : DATE_HEADERS) {
            for (Map.Entry<Integer, String> e : headers.entrySet()) {
                if (TextUtils.normalize(e.getValue()).equals(candidate)) {
                    return e.getKey();
                }
            }
        }
        return null;
    }

    private String formatCell(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) {
            return null;
        }
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        String value = switch (type) {
            case BOOLEAN -> cell.getBooleanCellValue() ? "Oui" : "Non";
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? formatDateTime(cell.getLocalDateTimeCellValue())
                    : formatter.formatCellValue(cell, evaluator);
            case ERROR, BLANK, _NONE -> null;
            default -> formatter.formatCellValue(cell, evaluator);
        };
        return TextUtils.trimToNull(value);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.toLocalTime().equals(java.time.LocalTime.MIDNIGHT)
                ? dateTime.format(DATE_FORMAT)
                : dateTime.format(DATE_TIME_FORMAT);
    }

    private LocalDate readDate(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            LocalDateTime dt = cell.getLocalDateTimeCellValue();
            return dt == null ? null : dt.toLocalDate();
        }
        String text = TextUtils.trimToNull(formatter.formatCellValue(cell));
        if (text == null) {
            return null;
        }
        String datePart = text.split(" ")[0];
        for (DateTimeFormatter f : List.of(DATE_FORMAT, DateTimeFormatter.ISO_LOCAL_DATE)) {
            try {
                return LocalDate.parse(datePart, f);
            } catch (DateTimeParseException ignored) {
                // try next format
            }
        }
        return null;
    }
}
