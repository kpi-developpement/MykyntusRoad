package com.mykyntus.repository;

import com.mykyntus.entity.Dossier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

/** Simple CRUD access. Dynamic search lives in {@link com.mykyntus.repository.search.DossierSearchRepository}. */
public interface DossierRepository extends JpaRepository<Dossier, Long> {

    List<Dossier> findByIdExterneIn(Collection<String> idsExterne);
}
