package com.mykyntus;

import com.mykyntus.exception.ApiException;
import com.mykyntus.service.PreferenceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Each account keeps its own settings (column order of every table). */
@SpringBootTest
@ActiveProfiles("test")
class PreferenceIntegrationTest {

    @Autowired
    PreferenceService preferenceService;

    @Test
    void eachProfileHasItsOwnColumns() {
        String key = "grid.sec-espace";
        assertThat(preferenceService.get("pilote.secu", key).value()).isNull();

        preferenceService.save("pilote.secu", key, "{\"order\":[\"field:3\",\"delay\"]}");
        preferenceService.save("admin.secu", key, "{\"order\":[\"delay\"]}");
        assertThat(preferenceService.get("pilote.secu", key).value()).contains("field:3");
        assertThat(preferenceService.get("admin.secu", key).value()).doesNotContain("field:3");

        preferenceService.save("pilote.secu", key, "{\"order\":[]}");
        assertThat(preferenceService.get("pilote.secu", key).value()).isEqualTo("{\"order\":[]}");
        // empty = back to the default
        preferenceService.save("pilote.secu", key, null);
        assertThat(preferenceService.get("pilote.secu", key).value()).isNull();

        assertThatThrownBy(() -> preferenceService.get("pilote.secu", "bad key!")).isInstanceOf(ApiException.class);
    }
}
