package com.mykyntus.entity;

public enum FieldType {
    /** Dropdown: value must be one of the options defined by the admin. */
    SELECT,
    /** Free text. */
    TEXT,
    /** Date (yyyy-MM-dd), filled with today when the dossier is treated. */
    DATE,
    /** Name of the user who treated the dossier, filled automatically. */
    USER
}
