package com.mykyntus.dto.dossier;

import com.mykyntus.entity.FieldSection;

import java.util.List;

/**
 * Counters displayed above the table.
 *
 * @param total       dossiers matching the criteria
 * @param sections    per section: dossiers with at least one value filled ("treated" = touched) and dossiers done
 * @param secuPending dossiers whose sécurisation is still missing (appointment tomorrow or today)
 */
public record DossierStatsResponse(long total, List<SectionStat> sections, long secuPending) {

    public record SectionStat(FieldSection section, String label, long treated, long fields, long done) {
    }
}
