package com.mykyntus.service;

import com.mykyntus.dto.flag.DossierFlagsResponse;
import com.mykyntus.dto.flag.FlagCreateRequest;
import com.mykyntus.dto.flag.FlagResponse;
import com.mykyntus.entity.*;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.DossierEventRepository;
import com.mykyntus.repository.DossierRepository;
import com.mykyntus.repository.FlagDefinitionRepository;
import com.mykyntus.security.CurrentUser;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Flags ("drapeaux") of the dossiers.
 * <p>
 * Automatic detection (case and accents ignored) reads 3 text columns + 1 boolean column of the imported
 * files: Type de commande, Score client, Motif de sécurisation and Gardé en Main. As long as nobody changed
 * the flags of a dossier by hand, they are recomputed at every import. Once changed by hand, the manual list
 * is kept until it is reset.
 */
@Service
@RequiredArgsConstructor
public class FlagService {

    /** Colours offered for custom flags. */
    public static final List<String> CUSTOM_COLORS = List.of("VIOLET_VIF", "FUCHSIA", "BLEU_CIEL", "ARDOISE", "PIERRE");

    private static final String SEPARATOR = "|";
    private static final Pattern CODE_PATTERN = Pattern.compile("^[A-Z0-9&+\\-_]{1,12}$");
    private static final Set<String> TRUE_VALUES = Set.of("vrai", "true", "oui", "yes", "1", "x", "o", "y");

    /** The 11 predefined flags, in display order. */
    static final List<FlagDefinition> BUILTIN = List.of(
            builtin("P1", "P1", "RED", 1),
            builtin("P2", "P2", "ORANGE", 2),
            builtin("MIG", "Migration", "VIOLET", 3),
            builtin("TH", "Travaux Hauteur", "AMBER", 4),
            builtin("SECU", "Sécurisation", "BLUE", 5),
            builtin("GRE", "GRE", "TURQUOISE", 6),
            builtin("R1", "Rang 1", "EMERALD", 7),
            builtin("R2", "Rang 2", "CYAN", 8),
            builtin("R3&+", "Rang 3 et +", "PINK", 9),
            builtin("RTI", "Rappel TI", "INDIGO", 10),
            builtin("GEM", "Gardé en main", "LIME", 11));

    private final FlagDefinitionRepository flagRepository;
    private final DossierRepository dossierRepository;
    private final DossierEventRepository eventRepository;

    private static FlagDefinition builtin(String code, String label, String color, int position) {
        return FlagDefinition.builder().code(code).label(label).color(color).builtin(true).position(position).build();
    }

    // ------------------------------------------------------------------ definitions

    @Transactional(readOnly = true)
    public List<FlagResponse> definitions() {
        return flagRepository.findAllByOrderByPositionAscIdAsc().stream().map(FlagService::toResponse).toList();
    }

    @Transactional
    public FlagResponse create(FlagCreateRequest request, CurrentUser user) {
        requireFlagRights(user);
        String code = request.code().trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        if (!CODE_PATTERN.matcher(code).matches()) {
            throw ApiException.badRequest("Code invalide : 1 à 12 caractères (lettres, chiffres, & + - _)");
        }
        String color = request.color().trim().toUpperCase(Locale.ROOT);
        if (!CUSTOM_COLORS.contains(color)) {
            throw ApiException.badRequest("Couleur inconnue : " + request.color());
        }
        if (flagRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("Le drapeau " + code + " existe déjà");
        }
        FlagDefinition flag = flagRepository.save(FlagDefinition.builder()
                .code(code)
                .label(request.label().trim())
                .color(color)
                .builtin(false)
                .position(flagRepository.findMaxPosition() + 1)
                .createdBy(user.username())
                .build());
        return toResponse(flag);
    }

    /** Creates the predefined flags that are missing (runs at startup). */
    @Transactional
    public void seedBuiltins() {
        for (FlagDefinition def : BUILTIN) {
            if (flagRepository.findByCodeIgnoreCase(def.getCode()).isEmpty()) {
                flagRepository.save(FlagDefinition.builder().code(def.getCode()).label(def.getLabel())
                        .color(def.getColor()).builtin(true).position(def.getPosition()).build());
            }
        }
    }

    // ------------------------------------------------------------------ dossier flags

    /** Manual flags: from now on the imports keep this list. */
    @Transactional
    public DossierFlagsResponse setManual(Long dossierId, List<String> codes, CurrentUser user) {
        requireFlagRights(user);
        Dossier dossier = dossierRepository.findById(dossierId)
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable"));
        Map<String, FlagDefinition> known = flagRepository.findAll().stream()
                .collect(Collectors.toMap(f -> f.getCode().toUpperCase(Locale.ROOT), f -> f));
        Set<String> wanted = new HashSet<>();
        for (String code : codes == null ? List.<String>of() : codes) {
            String c = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
            if (!known.containsKey(c)) {
                throw ApiException.badRequest("Drapeau inconnu : " + code);
            }
            wanted.add(known.get(c).getCode());
        }
        List<String> ordered = flagRepository.findAllByOrderByPositionAscIdAsc().stream()
                .map(FlagDefinition::getCode).filter(wanted::contains).toList();
        String old = dossier.getFlags();
        dossier.setFlags(encode(ordered));
        dossier.setFlagsManual(true);
        dossier.setUpdatedAt(LocalDateTime.now());
        logChange(dossier, old, "Drapeaux modifiés à la main", user);
        return new DossierFlagsResponse(dossier.getId(), ordered, true);
    }

    /** Back to the flags detected from the dossier columns. */
    @Transactional
    public DossierFlagsResponse reset(Long dossierId, CurrentUser user) {
        requireFlagRights(user);
        Dossier dossier = dossierRepository.findById(dossierId)
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable"));
        String old = dossier.getFlags();
        dossier.setFlagsManual(false);
        applyAutomatic(dossier);
        dossier.setUpdatedAt(LocalDateTime.now());
        logChange(dossier, old, "Drapeaux réinitialisés (détection automatique)", user);
        return new DossierFlagsResponse(dossier.getId(), decode(dossier.getFlags()), false);
    }

    /** Recomputes the flags of a dossier unless they were changed by hand. */
    public void applyAutomatic(Dossier dossier) {
        if (dossier.isFlagsManual()) {
            return;
        }
        dossier.setFlags(encode(detect(dossier.getRawData())));
    }

    private void logChange(Dossier dossier, String old, String detail, CurrentUser user) {
        String before = String.join(", ", decode(old));
        String after = String.join(", ", decode(dossier.getFlags()));
        if (before.equals(after) && detail.startsWith("Drapeaux modifiés")) {
            return;
        }
        eventRepository.save(DossierEvent.builder()
                .dossier(dossier)
                .type(EventType.FLAGS_CHANGED)
                .fieldLabel("Drapeaux")
                .oldValue(before.isEmpty() ? null : before)
                .newValue(after.isEmpty() ? null : after)
                .detail(detail)
                .actor(user.username())
                .build());
    }

    private static void requireFlagRights(CurrentUser user) {
        if (user.role() == Role.PILOTE_J) {
            throw ApiException.forbidden("Vous ne pouvez pas modifier les drapeaux");
        }
    }

    // ------------------------------------------------------------------ detection

    /** Columns read by the automatic detection (normalized header, without "Ordre de travail:"). */
    private static final String TYPE = "type de commande";
    private static final String SCORE = "score client";
    private static final String MOTIF = "motif de securisation";
    private static final String GEM = "garde en main";

    /**
     * Predefined flags detected from the dossier data. A column may come from any imported file
     * (main, global or sécurisation files): every value found is taken into account.
     */
    public static List<String> detect(Map<String, String> raw) {
        StringBuilder type = new StringBuilder();
        StringBuilder score = new StringBuilder();
        StringBuilder motif = new StringBuilder();
        boolean gem = false;
        for (Map.Entry<String, String> e : raw.entrySet()) {
            String value = e.getValue();
            if (value == null || value.isBlank()) {
                continue;
            }
            switch (column(e.getKey())) {
                case TYPE -> type.append(' ').append(TextUtils.normalize(value)).append(" |");
                case SCORE -> score.append(' ').append(TextUtils.normalize(value)).append(" |");
                case MOTIF -> motif.append(' ').append(TextUtils.normalize(value)).append(" |");
                case GEM -> gem |= TRUE_VALUES.contains(TextUtils.normalize(value));
                default -> {
                    // not a flag column
                }
            }
        }
        String t = type.toString();
        String s = score.toString();
        String m = motif.toString();
        String all = t + s + m;

        List<String> flags = new ArrayList<>();
        if (word(all, "p1")) flags.add("P1");
        if (word(all, "p2")) flags.add("P2");
        if (contains(t + m, "migration") || word(t + m, "mig")) flags.add("MIG");
        if (contains(m, "hauteur") || contains(m, "nacelle") || word(m, "th")
                || contains(t, "hauteur") || word(t, "th") || word(s, "th")) flags.add("TH");
        if (!m.isBlank() || contains(t, "securis") || word(s, "secu")) flags.add("SECU");
        if (word(all, "gre")) flags.add("GRE");
        if (rank(m, 1) || word(m, "r1") || rank(t, 1) || word(s, "r1")) flags.add("R1");
        if (rank(m, 2) || word(m, "r2") || rank(t, 2) || word(s, "r2")) flags.add("R2");
        if (rank(m, 3) || contains(m, "r3&+") || word(m, "r3") || rank(t, 3) || word(s, "r3")) flags.add("R3&+");
        if (Pattern.compile("rappel ti(?![a-z0-9])").matcher(all).find() || word(all, "rti")) flags.add("RTI");
        if (gem) flags.add("GEM");
        return flags;
    }

    /** "S1::Ordre de travail: Score client" -> "score client". */
    private static String column(String key) {
        int sep = key.indexOf("::");
        String header = TextUtils.normalize(sep >= 0 ? key.substring(sep + 2) : key);
        if (header.startsWith("ordre de travail")) {
            header = header.substring("ordre de travail".length()).replaceFirst("^\\s*:\\s*", "");
        }
        return header.trim();
    }

    private static boolean contains(String text, String part) {
        return text.contains(part);
    }

    /** Exact word: not preceded nor followed by a letter or digit ("p1" matches "P1 urgent", not "p10"). */
    private static boolean word(String text, String w) {
        return Pattern.compile("(?<![a-z0-9])" + Pattern.quote(w) + "(?![a-z0-9])").matcher(text).find();
    }

    /** "rang 1" (also "rang1"), not "rang 10". */
    private static boolean rank(String text, int n) {
        return Pattern.compile("rang ?" + n + "(?![0-9])").matcher(text).find();
    }

    // ------------------------------------------------------------------ storage

    public static String encode(List<String> codes) {
        return codes.isEmpty() ? "" : SEPARATOR + String.join(SEPARATOR, codes) + SEPARATOR;
    }

    public static List<String> decode(String flags) {
        if (flags == null || flags.isBlank()) {
            return List.of();
        }
        return Arrays.stream(flags.split(Pattern.quote(SEPARATOR))).filter(s -> !s.isBlank()).toList();
    }

    public static FlagResponse toResponse(FlagDefinition f) {
        return new FlagResponse(f.getId(), f.getCode(), f.getLabel(), f.getColor(), f.isBuiltin(), f.getPosition());
    }
}
