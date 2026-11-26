package com.mykyntus.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

/**
 * Hibernate ("ddl-auto: update") creates CHECK constraints listing the enum values when a table is
 * first created, but never updates them. New enum values (roles, sections, field types...) would then
 * be rejected by PostgreSQL. This removes those constraints at startup (the enums are validated in Java).
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class SchemaPatcher implements ApplicationRunner {

    private static final List<String> ENUM_CHECKS = List.of(
            "app_user:app_user_role_check",
            "app_field:app_field_section_check",
            "app_field:app_field_type_check",
            "source_column:source_column_source_check",
            "import_batch:import_batch_source_check",
            "dossier_event:dossier_event_type_check",
            "dossier_event:dossier_event_section_check",
            "dossier_worker:dossier_worker_team_check");

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // the planification role was removed: its accounts become J pilots
        int moved = jdbc.update("UPDATE app_user SET role = 'PILOTE_J' WHERE role = ?", com.mykyntus.entity.Role.LEGACY_PLANIFICATION);
        if (moved > 0) {
            log.info("{} planification account(s) converted to PILOTE_J", moved);
        }
        try (Connection connection = dataSource.getConnection()) {
            if (!"PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) {
                return;
            }
        }
        for (String entry : ENUM_CHECKS) {
            String[] parts = entry.split(":");
            jdbc.execute("ALTER TABLE IF EXISTS " + parts[0] + " DROP CONSTRAINT IF EXISTS " + parts[1]);
        }
        log.info("Enum check constraints removed (enums are validated by the application)");
    }
}
