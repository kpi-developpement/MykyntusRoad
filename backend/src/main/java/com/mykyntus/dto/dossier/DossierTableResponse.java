package com.mykyntus.dto.dossier;

import com.mykyntus.dto.common.PageResponse;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.importing.SourceColumnResponse;

import java.util.List;

/** Everything the UI needs to render the table: dynamic columns, app fields and the rows. */
public record DossierTableResponse(List<SourceColumnResponse> sourceColumns,
                                   List<AppFieldResponse> fields,
                                   PageResponse<DossierRowResponse> rows) {
}
