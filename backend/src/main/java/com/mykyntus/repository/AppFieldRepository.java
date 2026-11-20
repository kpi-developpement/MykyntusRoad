package com.mykyntus.repository;

import com.mykyntus.entity.AppField;
import com.mykyntus.entity.FieldSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AppFieldRepository extends JpaRepository<AppField, Long> {

    @Query("select distinct f from AppField f left join fetch f.options")
    List<AppField> findAllWithOptions();

    boolean existsByCode(String code);

    @Query("select coalesce(max(f.position), 0) from AppField f where f.section = :section")
    int findMaxPosition(@Param("section") FieldSection section);
}
