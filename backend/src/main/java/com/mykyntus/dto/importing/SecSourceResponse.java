package com.mykyntus.dto.importing;

import com.mykyntus.entity.DataSource;

/**
 * One of the 3 sécurisation file slots.
 *
 * @param lastImport last file imported in this slot (null if none)
 * @param columns    columns discovered in this slot
 * @param visible    columns displayed in the sécurisation space
 */
public record SecSourceResponse(int slot, DataSource source, ImportBatchResponse lastImport, long columns, long visible) {
}
