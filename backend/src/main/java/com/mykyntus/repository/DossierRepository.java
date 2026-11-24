package com.mykyntus.repository;

import com.mykyntus.entity.Dossier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** Simple CRUD access. Dynamic search lives in {@link com.mykyntus.repository.search.DossierSearchRepository}. */
public interface DossierRepository extends JpaRepository<Dossier, Long> {

    List<Dossier> findByIdExterneIn(Collection<String> idsExterne);

    @Query("select d.id from Dossier d order by d.id")
    List<Long> findAllIds();

    @Query("select count(d) > 0 from Dossier d where d.complete is null")
    boolean anyWithoutProgress();

    @Query("select d.id from Dossier d where d.flags is null")
    List<Long> findIdsWithoutFlags();

    @Query("select distinct d from Dossier d left join fetch d.rawData where d.id in :ids")
    List<Dossier> findWithRawData(@Param("ids") Collection<Long> ids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Dossier d set d.assignedTo = :pilote, d.assignedAt = :at where d.id in :ids")
    int assign(@Param("ids") Collection<Long> ids, @Param("pilote") String pilote, @Param("at") LocalDateTime at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Dossier d set d.assignedTo = null, d.assignedAt = null where d.assignedTo = :pilote")
    int unassignAll(@Param("pilote") String pilote);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Dossier d set d.assignedPlanif = null, d.assignedPlanifAt = null where d.assignedPlanif = :pilote")
    int unassignAllPlanif(@Param("pilote") String pilote);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Dossier d set d.assignedJ = null, d.assignedJAt = null where d.assignedJ = :pilote")
    int unassignAllJ(@Param("pilote") String pilote);
}
