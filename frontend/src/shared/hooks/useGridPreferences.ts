"use client";

import { useCallback } from "react";
import type { Density } from "../components/table/DataGrid/types";
import { useLocalStorageState } from "./useLocalStorageState";

interface GridPreferences {
  density: Density;
  /** key -> visible, only for columns changed by the user. */
  visibility: Record<string, boolean>;
}

const DEFAULTS: GridPreferences = { density: "comfortable", visibility: {} };

/** Density and visible columns of a table, remembered per browser. */
export function useGridPreferences(gridId: string) {
  const [prefs, setPrefs] = useLocalStorageState<GridPreferences>(`mykyntus.grid.${gridId}`, DEFAULTS);

  const isVisible = useCallback(
    (column: { key: string; pinned?: boolean; defaultHidden?: boolean }) =>
      !!column.pinned || (prefs.visibility[column.key] ?? !column.defaultHidden),
    [prefs.visibility],
  );

  const setVisible = useCallback(
    (key: string, visible: boolean) => setPrefs((p) => ({ ...p, visibility: { ...p.visibility, [key]: visible } })),
    [setPrefs],
  );

  const setDensity = useCallback((density: Density) => setPrefs((p) => ({ ...p, density })), [setPrefs]);
  const resetColumns = useCallback(() => setPrefs((p) => ({ ...p, visibility: {} })), [setPrefs]);

  return { density: prefs.density ?? "comfortable", setDensity, isVisible, setVisible, resetColumns };
}

export type GridPreferencesApi = ReturnType<typeof useGridPreferences>;
