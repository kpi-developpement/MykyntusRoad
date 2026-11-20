package com.mykyntus.dto.importing;

import java.time.LocalDateTime;

public record ImportBatchResponse(Long id, String fileName, com.mykyntus.entity.DataSource source, String importedBy, LocalDateTime importedAt,
                                  int totalRows, int createdRows, int updatedRows, int skippedRows) {
}
