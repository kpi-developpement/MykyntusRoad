package com.mykyntus.dto.dossier;

import com.mykyntus.dto.common.PageResponse;
import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.importing.SourceColumnResponse;

import java.util.List;

/**
 * Everything the UI needs to render the table: dynamic columns, app fields and the rows.
 *
 * @param openCount matching dossiers whose Cellule plani is open: the conditional J-1 columns are only
 *                  shown when there is at least one
 * @param names     username -> display name of every pilot shown in the page (leads and pilots who joined)
 */
public record DossierTableResponse(List<SourceColumnResponse> sourceColumns,
                                   List<AppFieldResponse> fields,
                                   PageResponse<DossierRowResponse> rows,
                                   long openCount,
                                   java.util.Map<String, String> names) {
}
