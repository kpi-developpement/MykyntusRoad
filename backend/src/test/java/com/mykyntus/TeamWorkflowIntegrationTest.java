package com.mykyntus;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.sec.AssignRequest;
import com.mykyntus.dto.sec.DispatchSummary;
import com.mykyntus.entity.FieldSection;
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

/**
 * Admin's file crossed with the sécurisation file (N/A), J-1 columns routed to the planification team,
 * per-team dispatch and ownership, delay (orange / red) and the life cycle.
 */
@SpringBootTest
@ActiveProfiles("test")
class TeamWorkflowIntegrationTest {

    /** J+1 = today: the open dossiers are orange before noon, red after. */
    private static final LocalDate DAY = LocalDate.now().minusDays(1);

    @Autowired
    ImportService importService;
    @Autowired
    DossierService dossierService;
    @Autowired
    DossierValueService valueService;
    @Autowired
    DossierTimelineService timelineService;
    @Autowired
    DispatchService dispatchService;

    @Test
    void crossCheckPlanificationAndDelay() throws Exception {
        CurrentUser secAdmin = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);
        CurrentUser secPilot = new CurrentUser("pilote.secu", Role.PILOTE_SECURISATION);
        CurrentUser planif = new CurrentUser("i.labyied", Role.PILOTE_PLANIFICATION);
        CurrentUser agent = new CurrentUser("a.guengombe", Role.PILOTE_J);

        importService.importSecurisation(0, file(new String[]{"EPS", "Motif"}, "EPS-TW-0001", "EPS-TW-0002"), DAY, "admin.secu");
        importService.importMain(file(new String[]{"Ordre de travail: ID Externe", "Type de travail"},
                "EPS-TW-0001", "EPS-TW-0002", "EPS-TW-0003"), DAY, "admin");

        // in the admin's file only: "Etat final" and "Commentaire de traitement" set to N/A
        DossierTableResponse table = dossierService.search(criteria(List.of()));
        AppFieldResponse etat = field(table, "sec_etat_final");
        AppFieldResponse commentaire = field(table, "sec_commentaire");
        DossierRowResponse absent = row("EPS-TW-0003");
        assertThat(absent.horsSecu()).isTrue();
        assertThat(absent.values()).containsEntry(etat.id(), "NA").containsEntry(commentaire.id(), "N/A");
        assertThat(row("EPS-TW-0001").horsSecu()).isFalse();
        assertThat(row("EPS-TW-0001").values()).doesNotContainKey(etat.id());

        // "Cellule plani" is a sécurisation column, the other J-1 columns follow it
        AppFieldResponse plani = field(table, "j1_cellule_plani");
        AppFieldResponse mail = field(table, "j1_mail");
        AppFieldResponse objet = field(table, "j1_mail_objet");
        assertThat(plani.section()).isEqualTo(FieldSection.SECURISATION);
        assertThat(plani.planification()).isFalse();
        assertThat(mail.section()).isEqualTo(FieldSection.SECURISATION);
        assertThat(mail.planification()).isTrue();
        assertThat(table.fields()).noneMatch(f -> f.code().equals("j1_cellule_securisation"));

        Long id = row("EPS-TW-0001").id();
        dispatchService.assign(Team.SECURISATION, new AssignRequest(List.of(id), "pilote.secu"), "admin.secu");
        valueService.updateValue(id, plani.id(), "Ouvert", secPilot);
        assertThat(row("EPS-TW-0001").planification()).isTrue();
        // not "Planifié": the J-1 columns now belong to the planification team
        assertThatThrownBy(() -> valueService.updateValue(id, mail.id(), "Oui", secPilot)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> valueService.updateValue(id, mail.id(), "Oui", planif)).isInstanceOf(ApiException.class);
        assertThat(ids(List.of(new ColumnFilter("route", List.of("PLANIFICATION"), null)))).containsExactly("EPS-TW-0001");

        DispatchSummary planifScope = dispatchService.summary(Team.PLANIFICATION, criteria(List.of()));
        assertThat(planifScope.total()).isEqualTo(1);
        dispatchService.assign(Team.PLANIFICATION, new AssignRequest(List.of(id), "i.labyied"), "admin");
        valueService.updateValue(id, mail.id(), "Oui", planif);
        valueService.updateValue(id, objet.id(), "Relance RDV", planif);
        assertThat(row("EPS-TW-0001").assignedPlanif()).isEqualTo("i.labyied");

        // J agent: only his dossiers
        AppFieldResponse jField = table.fields().stream().filter(f -> f.section() == FieldSection.J).findFirst().orElseThrow();
        assertThatThrownBy(() -> valueService.updateValue(id, jField.id(), null, agent)).isInstanceOf(ApiException.class);
        dispatchService.assign(Team.J, new AssignRequest(List.of(id), "a.guengombe"), "admin");
        valueService.updateValue(id, jField.id(), null, agent);
        assertThat(ids(List.of(new ColumnFilter("assignee:J", List.of("a.guengombe"), null)))).containsExactly("EPS-TW-0001");

        // "mes dossiers" first
        DossierSearchRequest pinned = new DossierSearchRequest(DAY, "EPS-TW", List.of(), null, 0, 50,
                new DossierSearchRequest.Pin("J", "a.guengombe"));
        assertThat(dossierService.search(pinned).rows().content().getFirst().idExterne()).isEqualTo("EPS-TW-0001");

        // delay: J+1 is today -> orange before noon, red after
        String expected = LocalDateTime.now().getHour() < 12 ? "SOON" : "LATE";
        assertThat(row("EPS-TW-0002").delay()).isEqualTo(expected);
        assertThat(ids(List.of(new ColumnFilter("delay", List.of(expected), null)))).contains("EPS-TW-0002");
        FacetResponse delays = dossierService.facets(new FacetRequest(criteria(List.of()), "delay", null, null));
        assertThat(delays.values()).contains(new FacetValue(expected, 3));

        // life cycle: planification stage, its columns, mails with their objet, history in the planification section
        DossierTimelineResponse timeline = timelineService.timeline(id);
        assertThat(timeline.stages()).extracting(DossierTimelineResponse.Stage::key)
                .containsExactly("IMPORT", "SECURISATION", "PLANIFICATION", "J", "J_PLUS_1");
        assertThat(timeline.planification()).isTrue();
        assertThat(timeline.mails()).anyMatch(m -> m.label().equals("Mail") && "Oui".equals(m.value())
                && "Relance RDV".equals(m.objet()) && m.section() == FieldSection.PLANIFICATION && "Islam LABYIED".equals(m.by()));
        assertThat(timeline.events()).anyMatch(e -> "Mail".equals(e.field()) && e.section() == FieldSection.PLANIFICATION);
        assertThat(timeline.assignees()).extracting(DossierTimelineResponse.Assignee::team)
                .containsExactly("SECURISATION", "PLANIFICATION", "J");

        // the dossier shows up later in a sécurisation file: the automatic N/A are removed
        importService.importSecurisation(0, file(new String[]{"EPS", "Motif"}, "EPS-TW-0003"), DAY, "admin.secu");
        assertThat(row("EPS-TW-0003").horsSecu()).isFalse();
        assertThat(row("EPS-TW-0003").values()).doesNotContainKey(etat.id());
        assertThat(secAdmin.role().canEdit(FieldSection.SECURISATION)).isTrue();
    }

    private AppFieldResponse field(DossierTableResponse table, String code) {
        return table.fields().stream().filter(f -> f.code().equals(code)).findFirst().orElseThrow();
    }

    private DossierSearchRequest criteria(List<ColumnFilter> filters) {
        return new DossierSearchRequest(DAY, "EPS-TW", filters, null, 0, 50);
    }

    private List<String> ids(List<ColumnFilter> filters) {
        return dossierService.search(criteria(filters)).rows().content().stream().map(DossierRowResponse::idExterne).toList();
    }

    private DossierRowResponse row(String idExterne) {
        return dossierService.search(new DossierSearchRequest(null, idExterne, List.of(), null, 0, 5))
                .rows().content().getFirst();
    }

    private static MockMultipartFile file(String[] headers, String... ids) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Feuil1");
            Row h = sheet.createRow(0);
            for (int c = 0; c < headers.length; c++) {
                h.createCell(c).setCellValue(headers[c]);
            }
            for (int r = 0; r < ids.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.createCell(0).setCellValue(ids[r]);
                row.createCell(1).setCellValue("x" + r);
            }
            wb.write(out);
            return new MockMultipartFile("file", "f.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}
