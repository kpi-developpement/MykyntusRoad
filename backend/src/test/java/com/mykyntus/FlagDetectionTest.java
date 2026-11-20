package com.mykyntus;

import com.mykyntus.service.FlagService;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** The 11 automatic flag rules (case and accents ignored, exact words). */
class FlagDetectionTest {

    private static final String TYPE = "Ordre de travail: Type de commande";
    private static final String SCORE = "Ordre de travail: Score client";
    private static final String MOTIF = "Ordre de travail: Motif de sécurisation";
    private static final String GEM = "Gardé en Main";

    private static List<String> detect(String... pairs) {
        Map<String, String> raw = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            raw.put(pairs[i], pairs[i + 1]);
        }
        return FlagService.detect(raw);
    }

    @Test
    void priorities() {
        assertThat(detect(SCORE, "Client P1")).containsExactly("P1");
        assertThat(detect(TYPE, "p2 - raccordement")).containsExactly("P2");
        // exact word only
        assertThat(detect(SCORE, "P10 / AP1")).isEmpty();
    }

    @Test
    void migrationAndHeight() {
        assertThat(detect(TYPE, "MIGRATION FTTH")).contains("MIG");
        assertThat(detect("G::" + MOTIF, "MIG")).contains("MIG", "SECU");
        assertThat(detect("G::" + MOTIF, "Travaux en hauteur, nacelle")).contains("TH");
        assertThat(detect(TYPE, "Hauteur")).contains("TH");
        assertThat(detect(SCORE, "TH")).containsExactly("TH");
        // "th" inside a word does not count
        assertThat(detect(TYPE, "FTTH")).isEmpty();
    }

    @Test
    void securisation() {
        assertThat(detect(MOTIF, "Client absent")).containsExactly("SECU");
        assertThat(detect(TYPE, "Sécurisation dossier")).containsExactly("SECU");
        assertThat(detect(SCORE, "secu")).containsExactly("SECU");
        assertThat(detect(MOTIF, "   ")).isEmpty();
    }

    @Test
    void ranksGreRtiAndGem() {
        assertThat(detect(SCORE, "GRE")).containsExactly("GRE");
        assertThat(detect(TYPE, "Rang 1")).containsExactly("R1");
        assertThat(detect(SCORE, "r2")).containsExactly("R2");
        assertThat(detect(MOTIF, "R3&+")).contains("R3&+");
        assertThat(detect(TYPE, "rang 10")).isEmpty();
        assertThat(detect(SCORE, "Rappel TI")).containsExactly("RTI");
        assertThat(detect(SCORE, "RTI")).containsExactly("RTI");
        assertThat(detect(GEM, "VRAI")).containsExactly("GEM");
        assertThat(detect(GEM, "Oui")).containsExactly("GEM");
        assertThat(detect(GEM, "FAUX")).isEmpty();
    }

    @Test
    void displayOrderAndStorage() {
        List<String> flags = detect(SCORE, "R1 P2 P1", MOTIF, "nacelle", GEM, "true");
        assertThat(flags).containsExactly("P1", "P2", "TH", "SECU", "R1", "GEM");
        assertThat(FlagService.decode(FlagService.encode(flags))).isEqualTo(flags);
        assertThat(FlagService.encode(List.of())).isEmpty();
    }
}
