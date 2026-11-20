package com.mykyntus.dto.importing;

/**
 * @param name   key of the column in the dossier data ("S1::Statut" for sécurisation file 1)
 * @param label  header as written in the file
 */
public record SourceColumnResponse(Long id, String name, String label, com.mykyntus.entity.DataSource source,
                                   int position, boolean visible) {
}
