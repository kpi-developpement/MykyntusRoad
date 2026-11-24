package com.mykyntus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One line of an imported file: which dossier it touched, whether it created it, and the values it
 * replaced (so the import can be cancelled exactly). Also links a file to its dossiers (dashboard, filters).
 */
@Entity
@Table(name = "import_row", indexes = {
        @Index(name = "idx_import_row_batch", columnList = "batch_id"),
        @Index(name = "idx_import_row_dossier", columnList = "dossier_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportRow {

    private static final char ENTRY = '\u001E';
    private static final char SEPARATOR = '\u001F';

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id")
    private ImportBatch batch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id")
    private Dossier dossier;

    /** The dossier did not exist before this file. */
    private boolean created;

    /** Date of the dossier before the file changed it (null = unchanged). */
    private LocalDate previousDate;

    /** Values replaced by the file: "key␟old␞key␞..." (a key without ␟ was absent). */
    @Column(columnDefinition = "TEXT")
    private String previous;

    /** Encodes key -> old value (null = the key did not exist). */
    public static String encode(Map<String, String> previous) {
        if (previous == null || previous.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : previous.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append(ENTRY);
            }
            sb.append(e.getKey());
            if (e.getValue() != null) {
                sb.append(SEPARATOR).append(e.getValue());
            }
        }
        return sb.toString();
    }

    public Map<String, String> decodePrevious() {
        Map<String, String> map = new LinkedHashMap<>();
        if (previous == null || previous.isEmpty()) {
            return map;
        }
        for (String entry : previous.split(String.valueOf(ENTRY), -1)) {
            int i = entry.indexOf(SEPARATOR);
            if (i < 0) {
                map.put(entry, null);
            } else {
                map.put(entry.substring(0, i), entry.substring(i + 1));
            }
        }
        return map;
    }
}
