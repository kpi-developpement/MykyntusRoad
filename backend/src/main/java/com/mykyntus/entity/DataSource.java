package com.mykyntus.entity;

/** Origin of imported data: the main daily file, the global sécurisation file or one of the 3 sécurisation files. */
public enum DataSource {
    MAIN(""),
    SEC_1("S1::"),
    SEC_2("S2::"),
    SEC_3("S3::"),
    /** Global sécurisation file: every dossier of the day with its flag columns (slot 0). */
    SEC_GLOBAL("G::");

    /** Prefix of the column keys stored for this source (keeps columns of different files apart). */
    private final String prefix;

    DataSource(String prefix) {
        this.prefix = prefix;
    }

    public String getPrefix() {
        return prefix;
    }

    public static DataSource secSlot(int slot) {
        return switch (slot) {
            case 1 -> SEC_1;
            case 2 -> SEC_2;
            case 3 -> SEC_3;
            case 0 -> SEC_GLOBAL;
            default -> throw new IllegalArgumentException("Fichier sécurisation inconnu : " + slot);
        };
    }

    /** Legacy rows (before sources existed) have no source: they come from the main file. */
    public static DataSource orMain(DataSource source) {
        return source == null ? MAIN : source;
    }
}
