package com.mykyntus.config;

import com.mykyntus.entity.Dossier;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.service.FlagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

/** Creates the 11 predefined flags and computes the flags of the dossiers imported before flags existed. */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class FlagBootstrap implements ApplicationRunner {

    private static final int CHUNK = 500;

    private final FlagService flagService;
    private final DossierRepository dossierRepository;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void run(ApplicationArguments args) {
        flagService.seedBuiltins();
        List<Long> ids = dossierRepository.findIdsWithoutFlags();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            List<Long> chunk = ids.subList(i, Math.min(i + CHUNK, ids.size()));
            transactionTemplate.executeWithoutResult(status -> {
                for (Dossier d : dossierRepository.findWithRawData(chunk)) {
                    flagService.applyAutomatic(d);
                }
            });
        }
        if (!ids.isEmpty()) {
            log.info("Flags computed for {} existing dossiers", ids.size());
        }
    }
}
