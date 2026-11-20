package com.mykyntus.config;

import com.mykyntus.entity.*;
import com.mykyntus.repository.AppFieldRepository;
import com.mykyntus.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Creates the default users and application columns. Runs at every start but only adds what is
 * missing, so existing databases also receive the new "Sécurisation" columns and account.
 * Default passwords MUST be changed after the first login.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private static final List<String> YES_NO = List.of("Oui", "Non");

    private final AppProperties properties;
    private final AppUserRepository userRepository;
    private final AppFieldRepository fieldRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.seed().enabled()) {
            return;
        }
        ensureUser("admin", "admin123", "Administrateur", Role.ADMIN);
        ensureUser("admin.secu", "secu1234", "Admin sécurisation", Role.ADMIN_SECURISATION);
        ensureUser("pilote.secu", "pilote123", "Pilote sécurisation", Role.PILOTE_SECURISATION);
        ensureUser("pilote.j", "pilote123", "Pilote J", Role.PILOTE_J);
        seedMainFields();
        seedSecurisationFields();
    }

    private void ensureUser(String username, String password, String fullName, Role role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }
        userRepository.save(AppUser.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .fullName(fullName)
                .role(role)
                .build());
        log.warn("Default user created: {} - change its password!", username);
    }

    private void seedMainFields() {
        if (fieldRepository.existsByCode("j1_cellule_plani")) {
            return;
        }
        // J-1
        field("j1_cellule_plani", "Cellule plani", FieldSection.J_MINUS_1, FieldType.SELECT, 1, List.of("Planifié", "Ouvert"));
        field("j1_commentaire", "Commentaire", FieldSection.J_MINUS_1, FieldType.SELECT, 2, List.of());
        field("j1_mail_teams", "Mail / Teams", FieldSection.J_MINUS_1, FieldType.SELECT, 3, YES_NO);
        field("j1_cellule_securisation", "Cellule sécurisation", FieldSection.J_MINUS_1, FieldType.SELECT, 4,
                List.of("Dossier sécurisé", "Client injoignable", "NA"));
        field("j1_mail", "Mail", FieldSection.J_MINUS_1, FieldType.SELECT, 5, YES_NO);
        // J
        field("j_ges_rdv", "Ges RDV", FieldSection.J, FieldType.SELECT, 1, List.of());
        field("j_cause", "Cause", FieldSection.J, FieldType.SELECT, 2, List.of());
        field("j_commentaire", "Commentaire", FieldSection.J, FieldType.SELECT, 3, List.of());
        field("j_mail_teams", "Mail / Teams", FieldSection.J, FieldType.SELECT, 4, YES_NO);
        field("j_statut", "Statut", FieldSection.J, FieldType.SELECT, 5, List.of());
        field("j_support_client", "Support client", FieldSection.J, FieldType.SELECT, 6, List.of());
        field("j_support_client_commentaire", "Commentaire", FieldSection.J, FieldType.SELECT, 7, List.of());
        field("j_support_technicien", "Support technicien", FieldSection.J, FieldType.SELECT, 8, List.of());
        field("j_support_technicien_commentaire", "Commentaire", FieldSection.J, FieldType.SELECT, 9, List.of());
        field("j_cloture", "Clôture", FieldSection.J, FieldType.SELECT, 10, List.of());
        // J+1 à 12h00
        field("j1p_cr_en_retard", "CR en retard", FieldSection.J_PLUS_1, FieldType.SELECT, 1, List.of());
        log.info("Default application fields created");
    }

    /** Work columns of the sécurisation pilots. "Etat final" is published in the main table. */
    private void seedSecurisationFields() {
        if (fieldRepository.existsByCode("sec_etat_final")) {
            return;
        }
        field("sec_date_traitement", "Date de traitement", FieldSection.SECURISATION, FieldType.DATE, 1, List.of());
        field("sec_pilote", "Pilote", FieldSection.SECURISATION, FieldType.USER, 2, List.of());
        field("sec_departement", "Département", FieldSection.SECURISATION, FieldType.SELECT, 3, List.of());
        field("sec_commentaire", "Commentaire de traitement", FieldSection.SECURISATION, FieldType.TEXT, 4, List.of());
        AppField etatFinal = field("sec_etat_final", "Etat final", FieldSection.SECURISATION, FieldType.SELECT, 5,
                List.of("Sécurisé", "Client injoignable", "Reporté", "Annulé", "NA"));
        etatFinal.setPublished(true);
        log.info("Sécurisation fields created");
    }

    private AppField field(String code, String label, FieldSection section, FieldType type, int position, List<String> options) {
        AppField field = AppField.builder()
                .code(code)
                .label(label)
                .section(section)
                .type(type)
                .position(position)
                .build();
        for (int i = 0; i < options.size(); i++) {
            field.getOptions().add(FieldOption.builder()
                    .field(field)
                    .value(options.get(i))
                    .position(i + 1)
                    .build());
        }
        return fieldRepository.save(field);
    }
}
