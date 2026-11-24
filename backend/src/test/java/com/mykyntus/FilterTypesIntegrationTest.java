package com.mykyntus;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.entity.Role;
import com.mykyntus.exception.ApiException;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.DossierService;
import com.mykyntus.service.DossierValueService;
import com.mykyntus.service.ImportService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Progress filters (non touché / en cours / traité) and the condition filters. */
@SpringBootTest
@ActiveProfiles("test")
class FilterTypesIntegrationTest {

    private static final LocalDate DAY = LocalDate.of(2026, 12, 15);

    @Autowired
    ImportService importService;
    @Autowired
    DossierService dossierService;
    @Autowired
    DossierValueService valueService;

    @Test
    void statusAndConditions() throws Exception {
        importService.importSecurisation(0, file(), DAY, "admin.secu");
        DossierTableResponse table = dossierService.search(criteria());
        Long etat = field(table, "sec_etat_final");
        Long dept = field(table, "j1_mail");
        CurrentUser pilot = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);

        // A: done (état final), B: in progress (only a comment), C: untouched
        valueService.updateValue(id("EPS-0000001001"), etat, "Sécurisé", pilot);
        valueService.updateValue(id("EPS-0000001002"), field(table, "sec_commentaire"), "Rappeler demain", pilot);
        assertThat(ids(status("DONE"))).containsExactly("EPS-0000001001");
        assertThat(ids(status("IN_PROGRESS"))).containsExactly("EPS-0000001002");
        assertThat(ids(status("UNTOUCHED"))).containsExactly("EPS-0000001003");
        assertThat(ids(new ColumnFilter("status:SECURISATION", List.of("UNTOUCHED", "IN_PROGRESS"), null))).hasSize(2);

        FacetResponse facets = dossierService.facets(new FacetRequest(criteria(), "status:SECURISATION", null, null));
        assertThat(facets.values()).containsExactly(new FacetValue("UNTOUCHED", 1), new FacetValue("IN_PROGRESS", 1), new FacetValue("DONE", 1));
        DossierStatsResponse stats = dossierService.stats(criteria());
        assertThat(stats.sections()).filteredOn(s -> s.section().name().equals("SECURISATION"))
                .singleElement().satisfies(s -> {
                    assertThat(s.treated()).isEqualTo(2);
                    assertThat(s.done()).isEqualTo(1);
                });

        // text conditions on an imported column
        String type = "raw:G::Ordre de travail: Type de commande";
        assertThat(ids(cond(type, "startsWith", "racc"))).containsExactlyInAnyOrder("EPS-0000001001", "EPS-0000001002");
        assertThat(ids(cond(type, "endsWith", "hauteur"))).containsExactly("EPS-0000001003");
        assertThat(ids(cond(type, "equals", "RACCORDEMENT P1"))).containsExactly("EPS-0000001001");
        assertThat(ids(cond(type, "notContains", "p1"))).containsExactlyInAnyOrder("EPS-0000001002", "EPS-0000001003");
        assertThat(ids(cond(type, "notEquals", "Raccordement"))).containsExactlyInAnyOrder("EPS-0000001001", "EPS-0000001003");

        // empty / not empty on an application column (values stored apart)
        assertThat(ids(cond("field:" + dept, "empty", null))).hasSize(3);
        assertThat(ids(cond("field:" + etat, "notEmpty", null))).containsExactly("EPS-0000001001");
        assertThat(ids(cond("assignee", "empty", null))).hasSize(3);

        // date range on a French formatted imported date and on the dossier date
        String rdv = "raw:G::Début planifié";
        assertThat(ids(new ColumnFilter(rdv, null, null, "between", "2026-12-14", "2026-12-15"))).containsExactly("EPS-0000001001");
        assertThat(ids(new ColumnFilter(rdv, null, null, "between", "2026-12-16", null))).containsExactlyInAnyOrder("EPS-0000001002", "EPS-0000001003");
        assertThat(ids(new ColumnFilter("date", null, null, "between", "2026-12-15", "2026-12-15"))).hasSize(3);

        assertThatThrownBy(() -> ids(cond(type, "bogus", "x"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> ids(new ColumnFilter("status:NOPE", List.of("DONE"), null))).isInstanceOf(ApiException.class);
    }

    private ColumnFilter status(String value) {
        return new ColumnFilter("status:SECURISATION", List.of(value), null);
    }

    private ColumnFilter cond(String key, String op, String text) {
        return new ColumnFilter(key, null, text, op, null, null);
    }

    private DossierSearchRequest criteria() {
        return new DossierSearchRequest(DAY, null, List.of(), null, 0, 50);
    }

    private List<String> ids(ColumnFilter filter) {
        return dossierService.search(new DossierSearchRequest(DAY, null, List.of(filter), null, 0, 50))
                .rows().content().stream().map(DossierRowResponse::idExterne).toList();
    }

    private Long id(String idExterne) {
        return dossierService.search(new DossierSearchRequest(DAY, idExterne, List.of(), null, 0, 5)).rows().content().getFirst().id();
    }

    private Long field(DossierTableResponse table, String code) {
        return table.fields().stream().filter(f -> f.code().equals(code)).findFirst().orElseThrow().id();
    }

    private MockMultipartFile file() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Global");
            String[][] data = {
                    {"Ordre de travail: ID Externe", "Ordre de travail: Type de commande", "Début planifié"},
                    {"EPS-0000001001", "Raccordement P1", "15/12/2026 09:00"},
                    {"EPS-0000001002", "Raccordement", "16/12/2026 14:00"},
                    {"EPS-0000001003", "Travaux hauteur", "20/12/2026"},
            };
            for (int r = 0; r < data.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < data[r].length; c++) {
                    row.createCell(c).setCellValue(data[r][c]);
                }
            }
            wb.write(out);
            return new MockMultipartFile("file", "global.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}
