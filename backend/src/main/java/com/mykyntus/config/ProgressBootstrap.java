package com.mykyntus.config;

import com.mykyntus.repository.DossierRepository;
import com.mykyntus.service.DossierProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Computes the routing / closed state of the dossiers created before it existed (runs once). */
@Component
@Order(3)
@RequiredArgsConstructor
public class ProgressBootstrap implements ApplicationRunner {

    private final DossierRepository dossierRepository;
    private final DossierProgressService progressService;

    @Override
    public void run(ApplicationArguments args) {
        if (dossierRepository.anyWithoutProgress()) {
            progressService.refreshAll();
        }
    }
}
