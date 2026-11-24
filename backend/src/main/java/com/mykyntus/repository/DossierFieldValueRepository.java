package com.mykyntus.repository;

import com.mykyntus.entity.DossierFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DossierFieldValueRepository extends JpaRepository<DossierFieldValue, Long> {

    @Query("select v from DossierFieldValue v join fetch v.field where v.dossier.id in :dossierIds")
    List<DossierFieldValue> findByDossierIds(@Param("dossierIds") Collection<Long> dossierIds);

    Optional<DossierFieldValue> findByDossierIdAndFieldId(Long dossierId, Long fieldId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from DossierFieldValue v where v.dossier.id in :ids")
    int deleteByDossierIds(@Param("ids") Collection<Long> ids);

    @Query("select distinct v.dossier.id from DossierFieldValue v where v.dossier.id in :ids")
    List<Long> dossiersWithValues(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("delete from DossierFieldValue v where v.field.id = :fieldId")
    void deleteByFieldId(@Param("fieldId") Long fieldId);
}
