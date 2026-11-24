package com.mykyntus;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.importing.BatchSummaryResponse;
import com.mykyntus.dto.importing.ImportResultResponse;
import com.mykyntus.dto.sec.AssignRequest;
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

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Files history, cancellation of a wrong file, filter "dossiers of a file", day colours, pilot alerts. */
@SpringBootTest
@ActiveProfiles("test")
class BatchRollbackIntegrationTest {

    private static final LocalDate DAY = LocalDate.of(2026, 3, 10);

    @Autowired
    ImportService importService;
    @Autowired
    DossierService dossierService;
    @Autowired
    BatchService batchService;
    @Autowired
    DashboardService dashboardService;
    @Autowired
    DispatchService dispatchService;

    @Test
    void cancelAWrongFile() throws Exception {
        CurrentUser admin = new CurrentUser("admin", Role.ADMIN);
        CurrentUser secAdmin = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);

        ImportResultResponse good = importService.importMain(file(new String[][]{{"EPS-RB-0001", "ok"}, {"EPS-RB-0002", "ok"}}), DAY, "admin");
        // wrong file: changes dossier 1, creates dossier 3
        ImportResultResponse wrong = importService.importMain(file(new String[][]{{"EPS-RB-0001", "faux"}, {"EPS-RB-0003", "faux"}}), DAY, "admin");

        // the dossiers of a file
        assertThat(ids(new ColumnFilter("batch", List.of(String.valueOf(wrong.batchId())), null)))
                .containsExactlyInAnyOrder("EPS-RB-0001", "EPS-RB-0003");
        assertThat(row("EPS-RB-0001").raw()).containsEntry("Type de travail", "faux");

        BatchSummaryResponse listed = batchService.list(admin, 50).stream().filter(b -> b.id().equals(wrong.batchId())).findFirst().orElseThrow();
        assertThat(listed.dossiers()).isEqualTo(2);
        assertThat(listed.canRollback()).isTrue();
        // the sécurisation admin sees it but cannot cancel the admin's file
        assertThat(batchService.list(secAdmin, 50).stream().filter(b -> b.id().equals(wrong.batchId())).findFirst().orElseThrow().canRollback()).isFalse();
        assertThatThrownBy(() -> batchService.rollback(wrong.batchId(), secAdmin)).isInstanceOf(ApiException.class);

        BatchSummaryResponse.Preview preview = batchService.preview(wrong.batchId(), admin);
        assertThat(preview.deleted()).isEqualTo(1);
        assertThat(preview.restored()).isEqualTo(1);

        batchService.rollback(wrong.batchId(), admin);
        assertThat(row("EPS-RB-0001").raw()).containsEntry("Type de travail", "ok");
        assertThat(dossierService.search(new DossierSearchRequest(null, "EPS-RB-0003", List.of(), null, 0, 5)).rows().content()).isEmpty();
        assertThat(batchService.list(admin, 50).stream().filter(b -> b.id().equals(wrong.batchId())).findFirst().orElseThrow().rolledBack()).isTrue();
        assertThatThrownBy(() -> batchService.rollback(wrong.batchId(), admin)).isInstanceOf(ApiException.class);

        // cancelling the first file: dossier 1 had no later file left -> removed with dossier 2
        assertThat(batchService.preview(good.batchId(), admin).deleted()).isEqualTo(2);

        // day colours: DAY is long past -> the open dossiers are late
        DashboardService.DayStat day = dashboardService.days(DAY, DAY).getFirst();
        assertThat(day.total()).isGreaterThanOrEqualTo(2);
        assertThat(day.status()).isEqualTo("LATE");

        // pilot alert: new dossiers dispatched to him
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        dispatchService.assign(Team.J, new AssignRequest(List.of(row("EPS-RB-0002").id()), "a.guengombe"), "admin");
        DashboardService.Work work = dashboardService.work(new CurrentUser("a.guengombe", Role.PILOTE_J), before);
        assertThat(work.team()).isEqualTo("J");
        assertThat(work.fresh()).isGreaterThanOrEqualTo(1);
        assertThat(dashboardService.work(admin, before).team()).isNull();
    }

    private List<String> ids(ColumnFilter filter) {
        return dossierService.search(new DossierSearchRequest(null, "EPS-RB", List.of(filter), null, 0, 50))
                .rows().content().stream().map(DossierRowResponse::idExterne).toList();
    }

    private DossierRowResponse row(String id) {
        return dossierService.search(new DossierSearchRequest(null, id, List.of(), null, 0, 5)).rows().content().getFirst();
    }

    private static MockMultipartFile file(String[][] rows) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Feuil1");
            Row h = sheet.createRow(0);
            h.createCell(0).setCellValue("Ordre de travail: ID Externe");
            h.createCell(1).setCellValue("Type de travail");
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.createCell(0).setCellValue(rows[r][0]);
                row.createCell(1).setCellValue(rows[r][1]);
            }
            wb.write(out);
            return new MockMultipartFile("file", "f.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}
