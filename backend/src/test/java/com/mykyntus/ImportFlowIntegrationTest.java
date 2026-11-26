package com.mykyntus;

import com.mykyntus.dto.auth.LoginRequest;
import com.mykyntus.dto.auth.LoginResponse;
import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.importing.ImportResultResponse;
import com.mykyntus.dto.field.AppFieldRequest;
import com.mykyntus.entity.Team;
import com.mykyntus.dto.sec.AssignRequest;
import com.mykyntus.entity.DataSource;
import com.mykyntus.entity.EventType;
import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.FieldType;
import com.mykyntus.exception.ApiException;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.entity.Role;
import com.mykyntus.service.AuthService;
import com.mykyntus.service.*;
import com.mykyntus.service.ImportService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class ImportFlowIntegrationTest {

    @Autowired
    AuthService authService;
    @Autowired
    ImportService importService;
    @Autowired
    DossierService dossierService;
    @Autowired
    DossierValueService valueService;
    @Autowired
    DossierTimelineService timelineService;
    @Autowired
    AppFieldService fieldService;
    @Autowired
    SourceColumnService sourceColumnService;
    @Autowired
    DispatchService dispatchService;

    @Test
    void importThenFillValues() throws Exception {
        LoginResponse login = authService.login(new LoginRequest("admin", "admin123"));
        assertThat(login.token()).isNotBlank();

        ImportResultResponse result = importService.importMain(sampleFile(), null, "admin");
        assertThat(result.createdRows()).isEqualTo(2);
        assertThat(result.columns()).contains("Ordre de travail: ID Externe", "Type de travail");

        DossierTableResponse table = dossierService.search(criteria(List.of(), null));
        assertThat(table.rows().totalElements()).isEqualTo(2);
        assertThat(table.sourceColumns().getFirst().name()).isEqualTo("Ordre de travail: ID Externe");
        assertThat(table.fields().getFirst().section()).isEqualTo(FieldSection.SECURISATION);
        DossierRowResponse row = table.rows().content().getFirst();
        assertThat(row.raw()).containsEntry("Gardé en Main", "Oui");

        AppFieldResponse cellulePlani = field(table, "j1_cellule_plani");
        CurrentUser pilote = new CurrentUser("pilote.secu", Role.PILOTE_SECURISATION);
        CurrentUser secAdmin = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);
        CurrentUser mainAdmin = new CurrentUser("admin", Role.ADMIN);
        // every injected dossier is "Planifié"; J-1 belongs to the admin and the J pilots, not to the sécurisation
        assertThat(row.values()).containsEntry(cellulePlani.id(), "Planifié");
        assertThatThrownBy(() -> valueService.updateValue(row.id(), cellulePlani.id(), "Ouvert", pilote))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> valueService.updateValue(row.id(), cellulePlani.id(), "Ouvert", secAdmin))
                .isInstanceOf(ApiException.class);
        assertThat(valueService.updateValue(row.id(), cellulePlani.id(), "Ouvert", mainAdmin).value())
                .isEqualTo("Ouvert");

        // value not in the dropdown
        assertThatThrownBy(() -> valueService.updateValue(row.id(), cellulePlani.id(), "xxx", mainAdmin))
                .isInstanceOf(ApiException.class);

        // pilote sécurisation cannot edit J section
        AppFieldResponse jField = table.fields().stream()
                .filter(f -> f.section() == FieldSection.J).findFirst().orElseThrow();
        assertThatThrownBy(() -> valueService.updateValue(row.id(), jField.id(), null, pilote))
                .isInstanceOf(ApiException.class);

        // re-import updates without duplicating, keeps app values
        ImportResultResponse again = importService.importMain(sampleFile(), null, "admin");
        assertThat(again.updatedRows()).isEqualTo(2);
        assertThat(again.createdRows()).isZero();
        DossierTableResponse after = dossierService.search(
                new DossierSearchRequest(null, "EPS-0022050200", List.of(), null, 0, 50));
        assertThat(after.rows().content().getFirst().values()).containsEntry(cellulePlani.id(), "Ouvert");

        assertColumnFilters(cellulePlani.id());
        assertSecurisation(row.id());
    }

    /** 3 sécurisation files, rights, auto fill, published "Etat final" and life cycle. */
    private void assertSecurisation(Long dossierId) throws Exception {
        CurrentUser admin = new CurrentUser("admin", Role.ADMIN);
        CurrentUser secAdmin = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);
        CurrentUser secPilot = new CurrentUser("pilote.secu", Role.PILOTE_SECURISATION);

        // identifier found by its "EPS" header, kept out of the columns; unknown dossier created
        ImportResultResponse sec = importService.importSecurisation(1, secFile(), null, "admin.secu");
        assertThat(sec.updatedRows()).isEqualTo(1);
        assertThat(sec.createdRows()).isEqualTo(1);
        assertThat(sec.columns()).containsExactly("Département client", "Commentaire source");

        DossierTableResponse t = dossierService.search(new DossierSearchRequest(LocalDate.of(2026, 11, 20), "EPS-0022050200", List.of(), null, 0, 10));
        assertThat(t.rows().content().getFirst().raw()).containsEntry("S1::Département client", "13");
        assertThat(t.sourceColumns()).anyMatch(c -> c.name().equals("S1::Département client")
                && c.source() == DataSource.SEC_1 && c.label().equals("Département client"));
        assertThat(ids(criteria(List.of(new ColumnFilter("raw:S1::Département client", List.of("13"), null)), null)))
                .containsExactly("EPS-0022050200");

        AppFieldResponse etat = field(t, "sec_etat_final");
        AppFieldResponse date = field(t, "sec_date_traitement");
        assertThat(etat.published()).isTrue();
        // "Pilote" and "Département" are no longer shown (the dispatch gives the pilot)
        assertThat(t.fields()).noneMatch(f -> f.code().equals("sec_pilote") || f.code().equals("sec_departement"));

        // only the sécurisation team writes the sécurisation section
        assertThatThrownBy(() -> valueService.updateValue(dossierId, etat.id(), "Sécurisé", admin)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> valueService.updateValue(dossierId, etat.id(), "Sécurisé", secPilot)).isInstanceOf(ApiException.class);
        dispatchService.assign(Team.SECURISATION, new AssignRequest(List.of(dossierId), "pilote.secu"), "admin.secu");
        assertThat(valueService.updateValue(dossierId, etat.id(), "Sécurisé", secPilot).value()).isEqualTo("Sécurisé");
        // "Date de traitement" = date the file was imported, never entered by hand
        assertThat(date.auto()).isTrue();
        assertThat(dossierService.search(new DossierSearchRequest(null, "EPS-0022050200", List.of(), null, 0, 5))
                .rows().content().getFirst().values()).containsEntry(date.id(), LocalDate.now().toString());
        valueService.updateValue(dossierId, etat.id(), "Reporté", secPilot);

        DossierTimelineResponse timeline = timelineService.timeline(dossierId);
        assertThat(timeline.stages()).extracting(DossierTimelineResponse.Stage::key)
                .containsExactly("IMPORT", "SECURISATION", "J_MINUS_1", "J", "J_PLUS_1");
        // Cellule plani set to "Ouvert" by the admin: J-1 is the last stage reached
        assertThat(timeline.stages().get(1).status()).isEqualTo("DONE");
        assertThat(timeline.stages().get(2).status()).isEqualTo("CURRENT");
        assertThat(timeline.stages().get(1).detail()).contains("Etat final : Reporté");
        assertThat(timeline.stages().get(1).fields()).anyMatch(f -> f.label().equals("Etat final") && "Reporté".equals(f.value()));
        assertThat(timeline.stages().get(3).status()).isEqualTo("PENDING");
        assertThat(timeline.mails()).extracting(DossierTimelineResponse.Mail::label).contains("Mail / Teams", "Mail");
        assertThat(timeline.edits()).isEqualTo(1);
        assertThat(timeline.events()).extracting(DossierTimelineResponse.Event::type)
                .contains(EventType.CREATED, EventType.DATA_RECEIVED, EventType.VALUE_SET);

        // configuration rights: each admin manages its own sections / files
        assertThatThrownBy(() -> fieldService.create(new AppFieldRequest("X", FieldSection.SECURISATION, FieldType.TEXT, null, null, null), admin))
                .isInstanceOf(ApiException.class);
        assertThat(fieldService.create(new AppFieldRequest("Motif", FieldSection.SECURISATION, FieldType.TEXT, null, null, null), secAdmin).code())
                .startsWith("securisation_");
        assertThat(sourceColumnService.findAll(secAdmin)).allMatch(c -> c.source() != DataSource.MAIN);
        Long mainColumn = sourceColumnService.findAll(admin).getFirst().id();
        assertThatThrownBy(() -> sourceColumnService.setVisible(mainColumn, false, secAdmin)).isInstanceOf(ApiException.class);
    }

    private AppFieldResponse field(DossierTableResponse table, String code) {
        return table.fields().stream().filter(f -> f.code().equals(code)).findFirst().orElseThrow();
    }

    private MockMultipartFile secFile() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Secu");
            String[][] data = {
                    {"EPS", "Département client", "Commentaire source"},
                    {"EPS-0022050200", "13", "ok"},
                    {"EPS-0099999999", "36", ""},
            };
            for (int r = 0; r < data.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < data[r].length; c++) {
                    row.createCell(c).setCellValue(data[r][c]);
                }
            }
            wb.write(out);
            return new MockMultipartFile("file", "secu.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }

    /** Server side filters / sort / facets / stats (dossier 1 = RACC_P_RE + Ouvert, dossier 2 = RACC_P_N + Planifié by default). */
    private void assertColumnFilters(Long fieldId) {
        String type = "raw:Type de travail";
        String field = "field:" + fieldId;

        assertThat(ids(criteria(List.of(new ColumnFilter(type, List.of("RACC_P_N"), null)), null)))
                .containsExactly("EPS-0022089644");
        assertThat(ids(criteria(List.of(new ColumnFilter(type, null, "p_r")), null)))
                .containsExactly("EPS-0022050200");
        assertThat(ids(criteria(List.of(new ColumnFilter(field, List.of("Ouvert"), null)), null)))
                .containsExactly("EPS-0022050200");
        assertThat(ids(criteria(List.of(new ColumnFilter(field, List.of("Planifié"), null)), null)))
                .containsExactly("EPS-0022089644");
        assertThat(ids(criteria(List.of(
                new ColumnFilter(field, List.of("Planifié"), null),
                new ColumnFilter(type, List.of("RACC_P_RE"), null)), null)))
                .isEmpty();

        // sort on an imported column and on an application column (empty values last)
        assertThat(ids(criteria(List.of(), new SortSpec(type, "desc"))))
                .containsExactly("EPS-0022050200", "EPS-0022089644");
        assertThat(ids(criteria(List.of(), new SortSpec(type, "asc"))))
                .containsExactly("EPS-0022089644", "EPS-0022050200");
        assertThat(ids(criteria(List.of(), new SortSpec(field, "asc"))))
                .containsExactly("EPS-0022050200", "EPS-0022089644");

        // facets: the filter of the same column is ignored, the others are applied
        FacetResponse typeFacets = dossierService.facets(new FacetRequest(
                criteria(List.of(new ColumnFilter(type, List.of("RACC_P_N"), null)), null), type, null, null));
        assertThat(typeFacets.values()).extracting(FacetValue::value).containsExactlyInAnyOrder("RACC_P_N", "RACC_P_RE");
        FacetResponse fieldFacets = dossierService.facets(new FacetRequest(criteria(List.of(), null), field, null, null));
        assertThat(fieldFacets.values()).containsExactly(new FacetValue("Ouvert", 1), new FacetValue("Planifié", 1));
        assertThat(fieldFacets.emptyCount()).isZero();
        FacetResponse dateFacets = dossierService.facets(new FacetRequest(criteria(List.of(), null), "date", null, null));
        assertThat(dateFacets.values()).containsExactly(new FacetValue("2026-11-20", 2));

        DossierStatsResponse stats = dossierService.stats(criteria(List.of(), null));
        assertThat(stats.total()).isEqualTo(2);
        // both: N/A on both (no sécurisation file imported yet); the import defaults do not count
        assertThat(stats.sections()).filteredOn(s -> s.section() == FieldSection.SECURISATION)
                .singleElement().extracting(DossierStatsResponse.SectionStat::treated).isEqualTo(2L);

        assertThatThrownBy(() -> dossierService.search(criteria(List.of(new ColumnFilter("bad", null, "x")), null)))
                .isInstanceOf(ApiException.class);
    }

    private DossierSearchRequest criteria(List<ColumnFilter> filters, SortSpec sort) {
        return new DossierSearchRequest(LocalDate.of(2026, 11, 20), null, filters, sort, 0, 50);
    }

    private List<String> ids(DossierSearchRequest request) {
        return dossierService.search(request).rows().content().stream().map(DossierRowResponse::idExterne).toList();
    }

    private MockMultipartFile sampleFile() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Feuil1");
            String[] headers = {"Ordre de travail: FYT", "Ordre de travail: ID Externe", "Type de travail",
                    "Début de la fenêtre d'arrivée", "Gardé en Main"};
            Row h = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                h.createCell(i).setCellValue(headers[i]);
            }
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy hh:mm"));
            Object[][] data = {
                    {"FYT028693941", "EPS-0022050200", "RACC_P_RE", LocalDateTime.of(2026, 11, 20, 16, 0), true},
                    {"FYT031371786", "EPS-0022089644", "RACC_P_N", LocalDateTime.of(2026, 11, 20, 11, 0), false},
            };
            for (int r = 0; r < data.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.createCell(0).setCellValue((String) data[r][0]);
                row.createCell(1).setCellValue((String) data[r][1]);
                row.createCell(2).setCellValue((String) data[r][2]);
                Cell d = row.createCell(3);
                d.setCellValue((LocalDateTime) data[r][3]);
                d.setCellStyle(dateStyle);
                row.createCell(4).setCellValue((Boolean) data[r][4]);
            }
            wb.write(out);
            return new MockMultipartFile("file", "export.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}
