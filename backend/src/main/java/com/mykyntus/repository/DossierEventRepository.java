package com.mykyntus.repository;

import com.mykyntus.entity.DossierEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DossierEventRepository extends JpaRepository<DossierEvent, Long> {

    List<DossierEvent> findByDossierIdOrderByAtAscIdAsc(Long dossierId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from DossierEvent e where e.dossier.id in :ids")
    int deleteByDossierIds(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);
}
