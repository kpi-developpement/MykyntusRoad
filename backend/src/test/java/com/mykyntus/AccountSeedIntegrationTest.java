package com.mykyntus;

import com.mykyntus.entity.AppUser;
import com.mykyntus.entity.Role;
import com.mykyntus.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** The team's accounts (seed/accounts.csv) are created at startup with their role. */
@SpringBootTest
@ActiveProfiles("test")
class AccountSeedIntegrationTest {

    @Autowired
    AppUserRepository userRepository;
    @Autowired
    PasswordEncoder passwordEncoder;

    @Test
    void teamAccountsExistWithTheirRole() {
        List<AppUser> users = userRepository.findAll();
        // 4 demo accounts + 129 people of the team (both files merged)
        assertThat(users).hasSizeGreaterThanOrEqualTo(133);
        assertThat(role("i.khaldi")).isEqualTo(Role.ADMIN);
        assertThat(role("f.mannad")).isEqualTo(Role.ADMIN);
        assertThat(role("s.lahmidi")).isEqualTo(Role.ADMIN_SECURISATION);
        assertThat(role("f.qerrech")).isEqualTo(Role.ADMIN_SECURISATION);
        assertThat(role("s.zeroual")).isEqualTo(Role.PILOTE_J);
        assertThat(role("a.meftah")).isEqualTo(Role.PILOTE_J);
        assertThat(role("b.el-gannab")).isEqualTo(Role.PILOTE_SECURISATION);
        assertThat(role("i.labiyed")).isEqualTo(Role.PILOTE_SECURISATION);
        // the public default password of the former demo account is never kept
        AppUser guengombe = userRepository.findByUsername("a.guengombe").orElseThrow();
        assertThat(passwordEncoder.matches("agent123", guengombe.getPassword())).isFalse();
        assertThat(guengombe.getFullName()).isEqualTo("GUENGOMBE Abed Prince");
        assertThat(userRepository.findByUsername("i.labyied")).isEmpty();
    }

    private Role role(String username) {
        return userRepository.findByUsername(username).orElseThrow().getRole();
    }
}
