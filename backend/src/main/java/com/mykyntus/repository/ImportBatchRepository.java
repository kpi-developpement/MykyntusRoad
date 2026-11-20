package com.mykyntus.repository;

import com.mykyntus.entity.DataSource;
import com.mykyntus.entity.ImportBatch;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ImportBatchRepository extends JpaRepository<ImportBatch, Long> {

    /** History of the main file (legacy rows without source included). */
    @Query("select b from ImportBatch b where b.source is null or b.source = com.mykyntus.entity.DataSource.MAIN order by b.importedAt desc")
    List<ImportBatch> findMainHistory(Pageable pageable);

    @Query("select b from ImportBatch b where b.source in :sources order by b.importedAt desc")
    List<ImportBatch> findHistory(@Param("sources") Collection<DataSource> sources, Pageable pageable);
}
