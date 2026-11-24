package com.mykyntus.config;

import com.mykyntus.service.BatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Dossiers of files cancelled before the "Annulé" state existed get it (runs at startup, idempotent). */
@Component
@Order(4)
@RequiredArgsConstructor
public class CancelledRepairBootstrap implements ApplicationRunner {

    private final BatchService batchService;

    @Override
    public void run(ApplicationArguments args) {
        batchService.repairCancelled();
    }
}
