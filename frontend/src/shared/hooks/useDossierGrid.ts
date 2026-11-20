"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dossierService } from "../services/dossierService";
import type { ColumnFilter, DossierCriteria, DossierRow, DossierStats, DossierTable, SortSpec } from "../types";

interface Options {
  initialDate: string;
  initialSearch?: string;
  initialFilters?: ColumnFilter[];
  pageSize?: number;
}

interface TableState {
  /** Criteria the data belongs to. */
  key: string | null;
  data: DossierTable | null;
  error: string | null;
  /** Incremented on every load (replays the row animation). */
  version: number;
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Erreur de chargement");

/**
 * State of a dossier table: criteria (date, search, column filters, sort, page),
 * server data, counters and value saving.
 */
export function useDossierGrid({ initialDate, initialSearch = "", initialFilters = [], pageSize = 50 }: Options) {
  const [criteria, setCriteria] = useState<DossierCriteria>({
    date: initialDate,
    search: initialSearch,
    filters: initialFilters,
    sort: null,
    page: 0,
    size: pageSize,
  });
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [reloadToken, setReloadToken] = useState(0);
  const [statsToken, setStatsToken] = useState(0);
  const [table, setTable] = useState<TableState>({ key: null, data: null, error: null, version: 0 });
  const [stats, setStats] = useState<DossierStats | null>(null);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentKey = JSON.stringify([criteria, reloadToken]);

  // table data
  useEffect(() => {
    let cancelled = false;
    const key = JSON.stringify([criteria, reloadToken]);
    dossierService.search(criteria).then(
      (data) => {
        if (!cancelled) setTable((prev) => ({ key, data, error: null, version: prev.version + 1 }));
      },
      (e: unknown) => {
        if (!cancelled) setTable((prev) => ({ ...prev, key, error: message(e) }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [criteria, reloadToken]);

  // counters (independent from pagination and sort)
  const { date, search, filters } = criteria;
  useEffect(() => {
    let cancelled = false;
    dossierService.stats({ date, search, filters, sort: null, page: 0, size: 1 }).then(
      (s) => {
        if (!cancelled) setStats(s);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [date, search, filters, reloadToken, statsToken]);

  // debounced search while typing
  useEffect(() => {
    const t = setTimeout(() => setCriteria((c) => (c.search === searchInput ? c : { ...c, search: searchInput, page: 0 })), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(
    () => () => {
      if (statsTimer.current) clearTimeout(statsTimer.current);
    },
    [],
  );

  const setDate = useCallback((value: string) => setCriteria((c) => ({ ...c, date: value, page: 0 })), []);
  const setPage = useCallback((page: number) => setCriteria((c) => ({ ...c, page })), []);
  const setSize = useCallback((size: number) => setCriteria((c) => ({ ...c, size, page: 0 })), []);
  const setSort = useCallback((sort: SortSpec | null) => setCriteria((c) => ({ ...c, sort, page: 0 })), []);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const setFilter = useCallback(
    (key: string, filter: ColumnFilter | null) =>
      setCriteria((c) => {
        const others = c.filters.filter((f) => f.key !== key);
        return { ...c, page: 0, filters: filter ? [...others, filter] : others };
      }),
    [],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setCriteria((c) => ({ ...c, filters: [], search: "", page: 0 }));
  }, []);

  /** Search a dossier on every date (command palette). */
  const applySearch = useCallback((q: string) => {
    setSearchInput(q);
    setCriteria((c) => ({ ...c, search: q, date: "", filters: [], page: 0 }));
  }, []);

  const saveValue = useCallback(async (dossierId: number, fieldId: number, value: string | null) => {
    const res = await dossierService.updateValue(dossierId, fieldId, value);
    setTable((prev) => {
      if (!prev.data) return prev;
      const content = prev.data.rows.content.map((row) => {
        if (row.id !== dossierId) return row;
        const values = { ...row.values, ...res.autoFilled };
        if (res.value === null) delete values[fieldId];
        else values[fieldId] = res.value;
        return { ...row, values };
      });
      return { ...prev, data: { ...prev.data, rows: { ...prev.data.rows, content } } };
    });
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(() => setStatsToken((t) => t + 1), 700);
  }, []);

  const loadFacets = useCallback((key: string, q: string) => dossierService.facets(criteria, key, q), [criteria]);

  /** Local update of one row (flags, pilot...) without reloading the page. */
  const patchRow = useCallback((dossierId: number, patch: Partial<DossierRow>) => {
    setTable((prev) => {
      if (!prev.data) return prev;
      const content = prev.data.rows.content.map((row) => (row.id === dossierId ? { ...row, ...patch } : row));
      return { ...prev, data: { ...prev.data, rows: { ...prev.data.rows, content } } };
    });
  }, []);

  /** Refreshes the counters (after a change that may move a dossier in or out of a filter). */
  const refreshStats = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(() => setStatsToken((t) => t + 1), 500);
  }, []);

  return {
    criteria,
    data: table.data,
    error: table.error,
    version: table.version,
    loading: table.key !== currentKey,
    initialLoading: table.data === null && table.error === null,
    stats,
    searchInput,
    setSearchInput,
    setDate,
    setPage,
    setSize,
    setSort,
    setFilter,
    clearFilters,
    applySearch,
    reload,
    saveValue,
    loadFacets,
    patchRow,
    refreshStats,
    statsToken,
  };
}

export type DossierGrid = ReturnType<typeof useDossierGrid>;
