package com.mykyntus.dto.importing;

import java.util.List;

public record ImportResultResponse(Long batchId, String fileName, int totalRows, int createdRows,
                                   int updatedRows, int skippedRows, List<String> columns,
                                   List<String> newColumns, List<String> warnings) {
}
