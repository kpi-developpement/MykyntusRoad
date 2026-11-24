package com.mykyntus.repository;

import com.mykyntus.entity.ImportRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ImportRowRepository extends JpaRepository<ImportRow, Long> {

    @Query("select r from ImportRow r join fetch r.dossier where r.batch.id = :batchId")
    List<ImportRow> findByBatch(@Param("batchId") Long batchId);

    /** Dossiers also present in a later, not cancelled file of the same source (that file wins). */
    @Query("""
            select distinct r.dossier.id from ImportRow r
            where r.dossier.id in :dossierIds and r.batch.id > :batchId
              and coalesce(r.batch.source, com.mykyntus.entity.DataSource.MAIN) = :source
              and (r.batch.rolledBack is null or r.batch.rolledBack = false)""")
    List<Long> findDossiersInLaterBatches(@Param("dossierIds") Collection<Long> dossierIds, @Param("batchId") Long batchId,
                                          @Param("source") com.mykyntus.entity.DataSource source);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from ImportRow r where r.dossier.id in :dossierIds")
    int deleteByDossierIds(@Param("dossierIds") Collection<Long> dossierIds);
}
