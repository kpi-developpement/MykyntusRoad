package com.mykyntus.repository;

import com.mykyntus.entity.SourceColumn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SourceColumnRepository extends JpaRepository<SourceColumn, Long> {
    List<SourceColumn> findAllByOrderByPositionAsc();
    List<SourceColumn> findByVisibleTrueOrderByPositionAsc();
    Optional<SourceColumn> findByName(String name);

    @Query("select coalesce(max(c.position), 0) from SourceColumn c")
    int findMaxPosition();
}
