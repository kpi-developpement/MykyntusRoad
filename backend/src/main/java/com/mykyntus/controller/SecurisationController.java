package com.mykyntus.controller;

import com.mykyntus.dto.importing.ImportBatchResponse;
import com.mykyntus.dto.importing.ImportResultResponse;
import com.mykyntus.dto.importing.SecSourceResponse;
import com.mykyntus.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/** ADMIN_SECURISATION only (see SecurityConfig): the global file (slot 0) and the 3 sécurisation files. */
@RestController
@RequestMapping("/api/sec")
@RequiredArgsConstructor
public class SecurisationController {

    private final ImportService importService;

    @GetMapping("/sources")
    public List<SecSourceResponse> sources() {
        return importService.securisationSources();
    }

    @PostMapping(value = "/imports/{slot}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResultResponse importFile(@PathVariable int slot, @RequestParam("file") MultipartFile file,
                                           @RequestParam(value = "date", required = false)
                                           @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                           @AuthenticationPrincipal Jwt jwt) {
        return importService.importSecurisation(slot, file, date, jwt.getSubject());
    }

    @GetMapping("/imports")
    public List<ImportBatchResponse> history() {
        return importService.securisationHistory();
    }
}
