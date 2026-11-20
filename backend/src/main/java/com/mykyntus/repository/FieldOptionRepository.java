package com.mykyntus.repository;

import com.mykyntus.entity.FieldOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FieldOptionRepository extends JpaRepository<FieldOption, Long> {

    boolean existsByFieldIdAndValueIgnoreCase(Long fieldId, String value);

    boolean existsByFieldIdAndValueIgnoreCaseAndActiveTrue(Long fieldId, String value);

    boolean existsByFieldIdAndValueIgnoreCaseAndIdNot(Long fieldId, String value, Long id);
}
