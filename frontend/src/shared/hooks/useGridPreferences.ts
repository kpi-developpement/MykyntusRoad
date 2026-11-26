"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Density } from "../components/table/DataGrid/types";
import { useAuth } from "../context/AuthContext";
import { preferenceService } from "../services/preferenceService";
import { storage } from "../utils/storage";

interface GridPreferences {
  density: Density;
  /** key -> visible, only for columns changed by the user. */
  visibility: Record<string, boolean>;
  /** Column keys in the order chosen by the user (columns not listed keep their default place). */
  order: string[];
}

interface ColumnLike {
  key: string;
  pinned?: boolean;
  defaultHidden?: boolean;
}

const DEFAULTS: GridPreferences = { density: "comfortable", visibility: {}, order: [] };
const SAVE_DELAY = 600;

function normalize(value: Partial<GridPreferences> | null | undefined): GridPreferences {
  return {
    density: value?.density === "compact" ? "compact" : "comfortable",
    visibility: value?.visibility && typeof value.visibility === "object" ? value.visibility : {},
    order: Array.isArray(value?.order) ? value.order.filter((k): k is string => typeof k === "string") : [],
  };
}

/**
 * Columns of a table as each profile wants them: order, visible columns and density.
 * Kept on the server for the connected account (the same on every computer), with a copy in the browser
 * so the table shows the right columns at once.
 */
export function useGridPreferences(gridId: string) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";
  const localKey = `mykyntus.grid.${username}.${gridId}`;
  const serverKey = `grid.${gridId}`;
  const [state, setState] = useState(() => ({ key: localKey, prefs: normalize(storage.get(localKey, DEFAULTS)), synced: false }));
  // another account / table: start again from its browser copy
  if (state.key !== localKey) {
    setState({ key: localKey, prefs: normalize(storage.get(localKey, DEFAULTS)), synced: false });
  }
  const { prefs, synced } = state;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const pending = useRef<(() => void) | null>(null);

  // the account's settings win over the browser copy
  useEffect(() => {
    let cancelled = false;
    dirty.current = false;
    if (!user) return;
    preferenceService.get(serverKey).then(
      (p) => {
        if (cancelled) return;
        let remote: GridPreferences | null = null;
        if (p.value && !dirty.current) {
          try {
            remote = normalize(JSON.parse(p.value) as Partial<GridPreferences>);
            storage.set(localKey, remote);
          } catch {
            /* unreadable value: the local one is kept */
          }
        }
        setState((s) => (s.key !== localKey ? s : { ...s, prefs: remote ?? s.prefs, synced: true }));
      },
      () => !cancelled && setState((s) => (s.key !== localKey ? s : { ...s, synced: true })),
    );
    return () => {
      cancelled = true;
    };
  }, [localKey, serverKey, user]);

  // a change of the user: kept in the browser at once, on the account a moment later (one call per burst)
  useEffect(() => {
    if (!dirty.current) return;
    storage.set(localKey, prefs);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const isDefault = prefs.order.length === 0 && Object.keys(prefs.visibility).length === 0 && prefs.density === "comfortable";
    const save = () => {
      saveTimer.current = null;
      pending.current = null;
      preferenceService.save(serverKey, isDefault ? null : JSON.stringify(prefs)).catch(() => undefined);
    };
    pending.current = save;
    saveTimer.current = setTimeout(save, SAVE_DELAY);
  }, [prefs, localKey, serverKey]);

  // leaving the page right after a change: the change is still saved
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      pending.current?.();
    },
    [],
  );

  const update = useCallback((change: (p: GridPreferences) => GridPreferences) => {
    dirty.current = true;
    setState((s) => ({ ...s, prefs: change(s.prefs) }));
  }, []);

  const isVisible = useCallback(
    (column: ColumnLike) => !!column.pinned || (prefs.visibility[column.key] ?? !column.defaultHidden),
    [prefs.visibility],
  );

  const setVisible = useCallback((key: string, visible: boolean) => update((p) => ({ ...p, visibility: { ...p.visibility, [key]: visible } })), [update]);
  const setDensity = useCallback((density: Density) => update((p) => ({ ...p, density })), [update]);
  const setOrder = useCallback((order: string[]) => update((p) => ({ ...p, order })), [update]);
  const resetColumns = useCallback(() => update((p) => ({ ...p, visibility: {}, order: [] })), [update]);

  /**
   * Columns in the order of the user: pinned ones first (they never move), then the others. A column the
   * user never placed (new imported column...) stays right after its default neighbour.
   */
  const arrange = useCallback(
    <C extends ColumnLike>(columns: C[]): C[] => {
      const pinned = columns.filter((c) => c.pinned);
      const others = columns.filter((c) => !c.pinned);
      if (prefs.order.length === 0) return [...pinned, ...others];
      const rank = new Map(prefs.order.map((k, i) => [k, i]));
      let last = -1;
      let step = 0;
      const ranked = others.map((c, i) => {
        const r = rank.get(c.key);
        if (r !== undefined) {
          last = r;
          step = 0;
          return { c, r, i };
        }
        step += 1;
        return { c, r: last + step / 1000, i };
      });
      ranked.sort((a, b) => a.r - b.r || a.i - b.i);
      return [...pinned, ...ranked.map((x) => x.c)];
    },
    [prefs.order],
  );

  return {
    density: prefs.density ?? "comfortable",
    setDensity,
    isVisible,
    setVisible,
    resetColumns,
    order: prefs.order,
    setOrder,
    arrange,
    /** The account's settings were loaded (or could not be). */
    synced,
    /** The user changed the order or the visible columns. */
    customized: prefs.order.length > 0 || Object.keys(prefs.visibility).length > 0,
  };
}

export type GridPreferencesApi = ReturnType<typeof useGridPreferences>;
