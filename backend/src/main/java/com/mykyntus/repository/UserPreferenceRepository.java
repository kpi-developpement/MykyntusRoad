package com.mykyntus.repository;

import com.mykyntus.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {

    Optional<UserPreference> findByUsernameAndKey(String username, String key);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from UserPreference p where p.username = :username")
    int deleteByUsername(@Param("username") String username);
}
