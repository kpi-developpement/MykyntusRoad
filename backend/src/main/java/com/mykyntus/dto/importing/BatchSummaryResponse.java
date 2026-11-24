package com.mykyntus.dto.importing;

import com.mykyntus.entity.DataSource;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One imported file with the state of its dossiers today.
 *
 * @param canRollback the connected admin owns this kind of file and it is not cancelled yet
 * @param dossiers    dossiers of the file that still exist
 * @param done        closed (every column filled)
 * @param late        not closed after J+1 12:00
 * @param soon        not closed, J+1 morning
 * @param onTime      not closed, before J+1
 * @param unassigned  not closed and without pilot in the team of the file (sécurisation / J)
 * @param firstDate   earliest dossier date of the file
 * @param lastDate    latest dossier date of the file
 */
public record BatchSummaryResponse(Long id, String fileName, DataSource source, String importedBy, LocalDateTime importedAt,
                                   int totalRows, int createdRows, int updatedRows, int skippedRows,
                                   boolean rolledBack, LocalDateTime rolledBackAt, String rolledBackBy, boolean canRollback,
                                   long dossiers, long done, long late, long soon, long onTime, long unassigned,
                                   LocalDate firstDate, LocalDate lastDate) {

    /**
     * What cancelling the file would do.
     *
     * @param deleted   dossiers created by the file, removed completely
     * @param restored  dossiers whose previous values are put back
     * @param kept      dossiers left as they are (a later file of the same kind wins)
     * @param worked    dossiers removed although a user already filled something on them
     */
    public record Preview(Long id, String fileName, long deleted, long restored, long kept, long worked) {
    }
}
