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
    VALUE_CLEARED
}
