package com.mykyntus.repository;

import com.mykyntus.entity.DossierWorker;
import com.mykyntus.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DossierWorkerRepository extends JpaRepository<DossierWorker, Long> {

    @Query("select w from DossierWorker w where w.dossier.id in :ids order by w.joinedAt asc, w.id asc")
    List<DossierWorker> findByDossierIds(@Param("ids") Collection<Long> ids);

    @Query("select w from DossierWorker w where w.dossier.id = :id and w.team = :team order by w.joinedAt asc, w.id asc")
    List<DossierWorker> findByDossierAndTeam(@Param("id") Long dossierId, @Param("team") Team team);

    @Query("select w from DossierWorker w where w.dossier.id = :id and w.team = :team and w.username = :username")
    Optional<DossierWorker> find(@Param("id") Long dossierId, @Param("team") Team team, @Param("username") String username);

    @Query("select count(w) > 0 from DossierWorker w where w.dossier.id = :id and w.team = :team and w.username = :username")
    boolean isWorker(@Param("id") Long dossierId, @Param("team") Team team, @Param("username") String username);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from DossierWorker w where w.username = :username")
    int deleteByUsername(@Param("username") String username);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from DossierWorker w where w.dossier.id in :ids")
    int deleteByDossierIds(@Param("ids") Collection<Long> ids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from DossierWorker w where w.team = :team and w.username = :username and w.dossier.id in :ids")
    int deleteWorker(@Param("team") Team team, @Param("username") String username, @Param("ids") Collection<Long> ids);
}
