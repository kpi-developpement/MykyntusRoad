package com.mykyntus.repository;

import com.mykyntus.entity.FlagDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FlagDefinitionRepository extends JpaRepository<FlagDefinition, Long> {

    List<FlagDefinition> findAllByOrderByPositionAscIdAsc();

    Optional<FlagDefinition> findByCodeIgnoreCase(String code);

    @Query("select coalesce(max(f.position), 0) from FlagDefinition f")
    int findMaxPosition();
}
