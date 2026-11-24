package com.mykyntus;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.flag.FlagCreateRequest;
import com.mykyntus.dto.importing.ImportResultResponse;
import com.mykyntus.dto.sec.*;
import com.mykyntus.entity.Role;
import com.mykyntus.entity.Team;
import com.mykyntus.exception.ApiException;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.service.*;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Global file -> flags -> pilots -> equitable dispatch -> transfer -> export. */
@SpringBootTest
@ActiveProfiles("test")
class DispatchIntegrationTest {

    private static final LocalDate DAY = LocalDate.of(2026, 12, 1);

    @Autowired
    ImportService importService;
    @Autowired
    DossierService dossierService;
    @Autowired
    FlagService flagService;
    @Autowired
    PiloteService piloteService;
    @Autowired
    DispatchService dispatchService;
    @Autowired
    ExportService exportService;

    @Test
    void globalFileFlagsAndDispatch() throws Exception {
        ImportResultResponse result = importService.importSecurisation(0, globalFile(), DAY, "admin.secu");
        assertThat(result.createdRows()).isEqualTo(9);

        // automatic flags
        DossierRowResponse first = row("EPS-0000000001");
        assertThat(first.flags()).containsExactly("P1", "SECU", "GEM");
        assertThat(first.flagsManual()).isFalse();
        assertThat(row("EPS-0000000009").flags()).isEmpty();

        // manual flags survive a re-import, reset brings the automatic ones back
        CurrentUser pilot = new CurrentUser("pilote.secu", Role.PILOTE_SECURISATION);
        CurrentUser secAdmin = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);
        flagService.create(new FlagCreateRequest("vip", "Client VIP", "FUCHSIA"), pilot);
        // a pilot only changes the flags of his own dossiers
        assertThatThrownBy(() -> flagService.setManual(first.id(), List.of("VIP"), pilot)).isInstanceOf(ApiException.class);
        flagService.setManual(first.id(), List.of("VIP", "P2"), secAdmin);
        importService.importSecurisation(0, globalFile(), DAY, "admin.secu");
        assertThat(row("EPS-0000000001").flags()).containsExactly("P2", "VIP");
        flagService.reset(first.id(), secAdmin);
        assertThat(row("EPS-0000000001").flags()).containsExactly("P1", "SECU", "GEM");
        assertThatThrownBy(() -> flagService.setManual(first.id(), List.of("NOPE"), secAdmin)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> flagService.create(new FlagCreateRequest("X", "x", "RED"), pilot)).isInstanceOf(ApiException.class);

        // flag filter and facets
        assertThat(ids(new ColumnFilter("flags", List.of("P1"), null))).hasSize(3);
        FacetResponse facets = dossierService.facets(new FacetRequest(criteria(), "flags", null, null));
        assertThat(facets.values()).contains(new FacetValue("P1", 3), new FacetValue("GEM", 3));
        assertThat(facets.emptyCount()).isEqualTo(3);

        // pilots + equitable dispatch: 3 each, one P1 each
        for (String name : List.of("pa", "pb", "pc")) {
            piloteService.create(new PiloteCreateRequest(name, "secret1", "Pilote " + name));
        }
        DispatchResult dispatch = dispatchService.dispatch(Team.SECURISATION, new DispatchRequest(criteria(), List.of("pa", "pb", "pc"), true), "admin.secu");
        assertThat(dispatch.moved()).isEqualTo(9);
        assertThat(dispatch.summary().unassigned()).isZero();
        Map<String, DispatchSummary.PiloteLoad> loads = loads(dispatch.summary());
        for (String name : List.of("pa", "pb", "pc")) {
            assertThat(loads.get(name).assigned()).isEqualTo(3);
            assertThat(loads.get(name).flags()).containsEntry("P1", 1L);
        }
        assertThat(ids(new ColumnFilter("assignee", List.of("pa"), null))).hasSize(3);

        // dispatching the unassigned again changes nothing
        assertThat(dispatchService.dispatch(Team.SECURISATION, new DispatchRequest(criteria(), List.of("pa", "pb", "pc"), true), "admin.secu").moved()).isZero();

        // pilot "pa" absent: his dossiers go to the others
        DispatchResult transfer = dispatchService.transfer(Team.SECURISATION, new TransferRequest(criteria(), "pa", List.of("pb", "pc"), null, false), "admin.secu");
        assertThat(transfer.moved()).isEqualTo(3);
        loads = loads(transfer.summary());
        assertThat(loads.get("pa").assigned()).isZero();
        assertThat(loads.get("pb").assigned() + loads.get("pc").assigned()).isEqualTo(9);
        assertThat(Math.abs(loads.get("pb").assigned() - loads.get("pc").assigned())).isLessThanOrEqualTo(1);

        // manual change of one dossier
        dispatchService.assign(Team.SECURISATION, new AssignRequest(List.of(first.id()), "pa"), "admin.secu");
        assertThat(row("EPS-0000000001").assignedTo()).isEqualTo("pa");
        flagService.setManual(first.id(), List.of("P2"), new CurrentUser("pa", Role.PILOTE_SECURISATION));
        assertThatThrownBy(() -> flagService.setManual(first.id(), List.of("P1"), new CurrentUser("pb", Role.PILOTE_SECURISATION)))
                .isInstanceOf(ApiException.class);
        flagService.reset(first.id(), secAdmin);
        assertThatThrownBy(() -> dispatchService.assign(Team.SECURISATION, new AssignRequest(List.of(first.id()), "ghost"), "admin.secu"))
                .isInstanceOf(ApiException.class);

        // export: flags and pilot included
        byte[] xlsx = exportService.export(new ExportRequest(criteria(), List.of(
                new ExportRequest.Column("idExterne", "EPS"),
                new ExportRequest.Column("flags", "Drapeaux"),
                new ExportRequest.Column("assignee", "Pilote"))));
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            Sheet sheet = wb.getSheetAt(0);
            assertThat(sheet.getLastRowNum()).isEqualTo(9);
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).isEqualTo("EPS-0000000001");
            assertThat(sheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("P1, SECU, GEM");
            assertThat(sheet.getRow(1).getCell(2).getStringCellValue()).isEqualTo("pa");
        }
    }

    private Map<String, DispatchSummary.PiloteLoad> loads(DispatchSummary summary) {
        return summary.pilotes().stream().collect(java.util.stream.Collectors.toMap(DispatchSummary.PiloteLoad::username, l -> l));
    }

    private DossierSearchRequest criteria() {
        return new DossierSearchRequest(DAY, null, List.of(), null, 0, 50);
    }

    private List<String> ids(ColumnFilter filter) {
        return dossierService.search(new DossierSearchRequest(DAY, null, List.of(filter), null, 0, 50))
                .rows().content().stream().map(DossierRowResponse::idExterne).toList();
    }

    private DossierRowResponse row(String id) {
        return dossierService.search(new DossierSearchRequest(DAY, id, List.of(), null, 0, 5)).rows().content().getFirst();
    }

    /** 9 dossiers: 3 P1 (also SECU + GEM), 3 TH, 3 without flag. */
    private MockMultipartFile globalFile() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Global");
            String[] headers = {"Ordre de travail: ID Externe", "Ordre de travail: Type de commande",
                    "Ordre de travail: Score client", "Ordre de travail: Motif de sécurisation", "Gardé en Main"};
            Row h = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                h.createCell(i).setCellValue(headers[i]);
            }
            for (int i = 1; i <= 9; i++) {
                Row row = sheet.createRow(i);
                row.createCell(0).setCellValue(String.format("EPS-%010d", i));
                row.createCell(1).setCellValue(i <= 6 && i > 3 ? "Travaux hauteur" : "Raccordement");
                row.createCell(2).setCellValue(i <= 3 ? "P1" : "Standard");
                row.createCell(3).setCellValue(i <= 3 ? "Client prioritaire" : "");
                row.createCell(4).setCellValue(i <= 3);
            }
            wb.write(out);
            return new MockMultipartFile("file", "global.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}
