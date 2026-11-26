package com.mykyntus.config;

import com.mykyntus.service.DossierProgressService;
import com.mykyntus.service.ImportDefaultsService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Dossiers still missing their import defaults (date de traitement, Cellule plani "Planifié"): filled at
 * startup, then their state is recomputed. Does nothing once every dossier has them.
 */
@Component
@Order(5)
@RequiredArgsConstructor
public class DefaultsBootstrap implements ApplicationRunner {

    private final ImportDefaultsService defaultsService;
    private final DossierProgressService progressService;

    @Override
    public void run(ApplicationArguments args) {
        if (defaultsService.backfill() > 0) {
            progressService.refreshAll();
        }
    }
}
