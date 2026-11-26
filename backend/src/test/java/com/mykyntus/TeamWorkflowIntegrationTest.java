package com.mykyntus;

import com.mykyntus.dto.dossier.*;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.sec.AssignRequest;
import com.mykyntus.dto.worker.DossierWorkersResponse;
import com.mykyntus.entity.EventType;
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
 * Admin's file crossed with the sécurisation file (N/A), import defaults (date de traitement, Cellule plani
 * "Planifié"), conditional J-1 columns, J pilots taking / joining a dossier, sécurisation alert, delay
 * (orange / red) and the life cycle.
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
    @Autowired
    WorkerService workerService;

    @Test
    void crossCheckJ1PilotsAndDelay() throws Exception {
        CurrentUser secAdmin = new CurrentUser("admin.secu", Role.ADMIN_SECURISATION);
        CurrentUser secPilot = new CurrentUser("pilote.secu", Role.PILOTE_SECURISATION);
        CurrentUser admin = new CurrentUser("admin", Role.ADMIN);
        CurrentUser agent = new CurrentUser("a.guengombe", Role.PILOTE_J);
        CurrentUser other = new CurrentUser("pilote.j", Role.PILOTE_J);

        importService.importSecurisation(0, file(new String[]{"EPS", "Motif"}, "EPS-TW-0001", "EPS-TW-0002"), DAY, "admin.secu");
        importService.importMain(file(new String[]{"Ordre de travail: ID Externe", "Type de travail"},
                "EPS-TW-0001", "EPS-TW-0002", "EPS-TW-0003"), DAY, "admin");

        // in the admin's file only: "Etat final" and "Commentaire de traitement" set to N/A
        DossierTableResponse table = dossierService.search(criteria(List.of()));
        AppFieldResponse etat = field(table, "sec_etat_final");
        AppFieldResponse commentaire = field(table, "sec_commentaire");
        AppFieldResponse date = field(table, "sec_date_traitement");
        DossierRowResponse absent = row("EPS-TW-0003");
        assertThat(absent.horsSecu()).isTrue();
        assertThat(absent.values()).containsEntry(etat.id(), "NA").containsEntry(commentaire.id(), "N/A");
        assertThat(row("EPS-TW-0001").horsSecu()).isFalse();
        assertThat(row("EPS-TW-0001").values()).doesNotContainKey(etat.id());

        // the sécurisation stops at "Etat final": "Cellule plani" and the conditional columns are J-1
        AppFieldResponse plani = field(table, "j1_cellule_plani");
        AppFieldResponse mail = field(table, "j1_mail");
        AppFieldResponse objet = field(table, "j1_mail_objet");
        assertThat(plani.section()).isEqualTo(FieldSection.J_MINUS_1);
        assertThat(plani.planification()).isFalse();
        assertThat(mail.section()).isEqualTo(FieldSection.J_MINUS_1);
        assertThat(mail.planification()).isTrue();
        assertThat(date.auto()).isTrue();
        assertThat(table.fields()).noneMatch(f -> f.code().equals("j1_cellule_securisation"));
        assertThat(Role.parse(Role.LEGACY_PLANIFICATION)).isEqualTo(Role.PILOTE_J);

        // injected = ready for everyone: Cellule plani "Planifié", date de traitement = import date
        DossierRowResponse first = row("EPS-TW-0001");
        assertThat(first.values()).containsEntry(plani.id(), "Planifié").containsEntry(date.id(), LocalDate.now().toString());
        assertThat(first.planification()).isFalse();
        assertThat(table.openCount()).isZero();
        Long id = first.id();
        assertThatThrownBy(() -> valueService.updateValue(id, date.id(), "2026-01-01", secAdmin)).isInstanceOf(ApiException.class);

        // J-1 is worked by the admin and the J pilots, not by the sécurisation
        dispatchService.assign(Team.SECURISATION, new AssignRequest(List.of(id), "pilote.secu"), "admin.secu");
        assertThatThrownBy(() -> valueService.updateValue(id, plani.id(), "Ouvert", secPilot)).isInstanceOf(ApiException.class);
        // a J pilot first takes the dossier
        assertThatThrownBy(() -> valueService.updateValue(id, plani.id(), "Ouvert", agent)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> workerService.join(id, Team.J, secPilot)).isInstanceOf(ApiException.class);
        DossierWorkersResponse taken = workerService.join(id, Team.J, agent);
        assertThat(taken.lead()).isEqualTo("a.guengombe");
        // closed while "Planifié"
        assertThatThrownBy(() -> valueService.updateValue(id, mail.id(), "Oui", agent)).isInstanceOf(ApiException.class);
        assertThat(valueService.updateValue(id, plani.id(), "Ouvert", agent).open()).isTrue();
        assertThat(row("EPS-TW-0001").planification()).isTrue();
        valueService.updateValue(id, mail.id(), "Oui", agent);
        valueService.updateValue(id, objet.id(), "Relance RDV", agent);
        assertThat(ids(List.of(new ColumnFilter("route", List.of("PLANIFICATION"), null)))).containsExactly("EPS-TW-0001");
        assertThat(dossierService.search(criteria(List.of())).openCount()).isEqualTo(1);

        // a second pilot joins the first one: both work the dossier
        assertThatThrownBy(() -> valueService.updateValue(id, mail.id(), "Non", other)).isInstanceOf(ApiException.class);
        DossierWorkersResponse joined = workerService.join(id, Team.J, other);
        assertThat(joined.workers()).extracting(w -> w.username()).containsExactly("a.guengombe", "pilote.j");
        valueService.updateValue(id, mail.id(), "Non", other);
        assertThat(row("EPS-TW-0001").assignedJ()).isEqualTo("a.guengombe");
        assertThat(row("EPS-TW-0001").workers()).containsEntry("J", List.of("pilote.j"));
        assertThat(ids(List.of(new ColumnFilter("assignee:J", List.of("pilote.j"), null)))).containsExactly("EPS-TW-0001");
        FacetResponse pilots = dossierService.facets(new FacetRequest(criteria(List.of()), "assignee:J", null, null));
        assertThat(pilots.values()).contains(new FacetValue("a.guengombe", 1), new FacetValue("pilote.j", 1));
        assertThat(pilots.emptyCount()).isEqualTo(2);

        // "mes dossiers" first (joined counts)
        DossierSearchRequest pinned = new DossierSearchRequest(DAY, "EPS-TW", List.of(), null, 0, 50,
                new DossierSearchRequest.Pin("J", "pilote.j"));
        assertThat(dossierService.search(pinned).rows().content().getFirst().idExterne()).isEqualTo("EPS-TW-0001");

        // delay: J+1 is today -> orange before noon, red after
        String expected = LocalDateTime.now().getHour() < 12 ? "SOON" : "LATE";
        assertThat(row("EPS-TW-0002").delay()).isEqualTo(expected);
        assertThat(ids(List.of(new ColumnFilter("delay", List.of(expected), null)))).contains("EPS-TW-0002");
        FacetResponse delays = dossierService.facets(new FacetRequest(criteria(List.of()), "delay", null, null));
        assertThat(delays.values()).contains(new FacetValue(expected, 3));

        // life cycle: J-1 stage, mails with their objet, pilots on the dossier
        DossierTimelineResponse timeline = timelineService.timeline(id);
        assertThat(timeline.stages()).extracting(DossierTimelineResponse.Stage::key)
                .containsExactly("IMPORT", "SECURISATION", "J_MINUS_1", "J", "J_PLUS_1");
        assertThat(timeline.planification()).isTrue();
        assertThat(timeline.mails()).anyMatch(m -> m.label().equals("Mail") && "Non".equals(m.value())
                && "Relance RDV".equals(m.objet()) && m.section() == FieldSection.J_MINUS_1);
        assertThat(timeline.events()).anyMatch(e -> e.type() == EventType.JOINED && "Pilote J".equals(e.actor()));
        // sécurisation lead (dispatch), then the J lead and the pilot who joined him
        assertThat(timeline.contributors()).extracting(DossierTimelineResponse.Contributor::username)
                .containsExactly("pilote.secu", "a.guengombe", "pilote.j");
        DossierTimelineResponse.Contributor lead = timeline.contributors().get(1);
        assertThat(lead.lead()).isTrue();
        assertThat(lead.team()).isEqualTo("J");
        assertThat(lead.actions()).isEqualTo(3);
        assertThat(timeline.edits()).isEqualTo(1);

        // the lead leaves: the other pilot takes over
        assertThat(workerService.leave(id, Team.J, agent).lead()).isEqualTo("pilote.j");
        assertThatThrownBy(() -> valueService.updateValue(id, mail.id(), "Oui", agent)).isInstanceOf(ApiException.class);
        assertThat(timelineService.timeline(id).contributors()).anyMatch(c -> c.username().equals("a.guengombe") && !c.active());

        // the dossier shows up later in a sécurisation file: the automatic N/A are removed
        importService.importSecurisation(0, file(new String[]{"EPS", "Motif"}, "EPS-TW-0003"), DAY, "admin.secu");
        assertThat(row("EPS-TW-0003").horsSecu()).isFalse();
        assertThat(row("EPS-TW-0003").values()).doesNotContainKey(etat.id());
        assertThat(admin.role().canEdit(FieldSection.J_MINUS_1)).isTrue();
    }

    /** The day before the appointment, a dossier whose "Etat final" is empty is declared not secured yet. */
    @Test
    void secuAlertTheDayBefore() throws Exception {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        importService.importSecurisation(0, file(new String[]{"EPS", "Motif"}, "EPS-AL-0001", "EPS-AL-0002"), tomorrow, "admin.secu");
        DossierSearchRequest criteria = new DossierSearchRequest(tomorrow, "EPS-AL", List.of(), null, 0, 50);
        assertThat(dossierService.search(criteria).rows().content()).allMatch(r -> "J_MINUS_1".equals(r.secuAlert()));
        assertThat(dossierService.stats(criteria).secuPending()).isEqualTo(2);

        DossierTableResponse table = dossierService.search(criteria);
        Long etat = field(table, "sec_etat_final").id();
        Long id = table.rows().content().stream().filter(r -> r.idExterne().equals("EPS-AL-0001")).findFirst().orElseThrow().id();
        valueService.updateValue(id, etat, "Sécurisé", new CurrentUser("admin.secu", Role.ADMIN_SECURISATION));

        DossierSearchRequest pending = new DossierSearchRequest(tomorrow, "EPS-AL",
                List.of(new ColumnFilter("secu", List.of("J_MINUS_1"), null)), null, 0, 50);
        assertThat(dossierService.search(pending).rows().content()).extracting(DossierRowResponse::idExterne).containsExactly("EPS-AL-0002");
        assertThat(dossierService.stats(criteria).secuPending()).isEqualTo(1);
        assertThat(timelineService.timeline(id).secuAlert()).isNull();
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
