package com.mykyntus.repository;

import com.mykyntus.entity.DossierEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DossierEventRepository extends JpaRepository<DossierEvent, Long> {

    List<DossierEvent> findByDossierIdOrderByAtAscIdAsc(Long dossierId);
}
