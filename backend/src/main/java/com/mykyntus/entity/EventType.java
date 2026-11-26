package com.mykyntus.entity;

/** What happened to a dossier (its life cycle). */
public enum EventType {
    /** Dossier created by an import (main or sécurisation file). */
    CREATED,
    /** Values already present changed by a new file (counts as a modification). */
    IMPORT_UPDATED,
    /** New data received from a file (main or sécurisation) without changing existing values. */
    DATA_RECEIVED,
    /** A user (or the auto fill) set / changed an application value. */
    VALUE_SET,
    /** A user cleared an application value. */
    VALUE_CLEARED,
    /** Flags of the dossier changed by hand (or reset to the automatic ones). */
    FLAGS_CHANGED,
    /** Dossier assigned to a sécurisation pilot (dispatch) or unassigned. */
    ASSIGNED,
    /** The values brought by a file were removed (import cancelled). */
    IMPORT_CANCELLED,
    /** A pilot took the dossier / joined the pilots already working on it. */
    JOINED,
    /** A pilot stopped working on the dossier. */
    LEFT
}
