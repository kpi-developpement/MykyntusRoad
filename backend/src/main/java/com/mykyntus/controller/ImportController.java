package com.mykyntus.controller;

import com.mykyntus.dto.importing.ImportBatchResponse;
import com.mykyntus.dto.importing.ImportResultResponse;
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

/** ADMIN only (see SecurityConfig). */
@RestController
@RequestMapping("/api/imports")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResultResponse importFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Jwt jwt) {
        return importService.importMain(file, date, jwt.getSubject());
    }

    @GetMapping
    public List<ImportBatchResponse> history() {
        return importService.mainHistory();
    }
}
