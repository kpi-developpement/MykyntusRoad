"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eraser, Search, TextSearch } from "lucide-react";
import { Button1 } from "../../button/Button1/Button1";
import { Checkbox1 } from "../../checkbox/Checkbox1/Checkbox1";
import { Popover } from "../../popover/Popover/Popover";
import { Skeleton } from "../../feedback/Skeleton/Skeleton";
import { useFocusOnMount } from "../../../hooks/useFocusOnMount";
import { cn } from "../../../utils/cn";
import type { ColumnFilter, FacetResponse, FacetValue } from "../../../types";
import type { GridColumn } from "../DataGrid/types";

interface FilterPopoverProps<T> {
  anchor: HTMLElement | null;
  onClose: () => void;
  column: GridColumn<T>;
  filter?: ColumnFilter;
  sortDir: "asc" | "desc" | null;
  onSort: (direction: "asc" | "desc" | null) => void;
  onApply: (filter: ColumnFilter | null) => void;
  loadFacets: (key: string, q: string) => Promise<FacetResponse>;
}

/** Excel-like column filter: sort, search, values with counts, "contains" filter. */
export function FilterPopover<T>(props: FilterPopoverProps<T>) {
  return (
    <Popover anchor={props.anchor} open={!!props.anchor} onClose={props.onClose} width={316}>
      <FilterPanel {...props} />
    </Popover>
  );
}

function FilterPanel<T>({ column, filter, sortDir, onSort, onApply, onClose, loadFacets }: FilterPopoverProps<T>) {
  const [q, setQ] = useState(filter?.text ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [result, setResult] = useState<{ q: string; data: FacetResponse | null; error: string | null } | null>(null);
  const [selected, setSelected] = useState<Set<string> | null>(() => (filter?.values?.length ? new Set(filter.values) : null));
  const [touched, setTouched] = useState(false);
  const searchRef = useFocusOnMount<HTMLInputElement>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    loadFacets(column.key, debouncedQ).then(
      (data) => {
        if (!cancelled) setResult({ q: debouncedQ, data, error: null });
      },
      (e: unknown) => {
        if (!cancelled) setResult({ q: debouncedQ, data: null, error: e instanceof Error ? e.message : "Erreur" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [column.key, debouncedQ, loadFacets]);

  const loading = result?.q !== debouncedQ;

  const entries = useMemo<FacetValue[]>(() => {
    const data = result?.data;
    if (!data) return [];
    const list: FacetValue[] = [];
    if (data.emptyCount > 0) list.push({ value: "", count: data.emptyCount });
    list.push(...data.values);
    if (column.knownValues && !result.q) {
      for (const v of column.knownValues) if (!list.some((e) => e.value === v)) list.push({ value: v, count: 0 });
    }
    return list;
  }, [result, column.knownValues]);

  const max = Math.max(1, ...entries.map((e) => e.count));
  const isChecked = (v: string) => selected === null || selected.has(v);
  const values = entries.map((e) => e.value);
  const allChecked = values.length > 0 && values.every(isChecked);
  const someChecked = values.some(isChecked);

  function toggle(v: string) {
    setTouched(true);
    setSelected((prev) => {
      const next = new Set(prev ?? values);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function toggleAll() {
    setTouched(true);
    setSelected((prev) => {
      const next = new Set(prev ?? values);
      if (allChecked) values.forEach((v) => next.delete(v));
      else values.forEach((v) => next.add(v));
      return next;
    });
  }

  function apply() {
    if (!touched) return onClose();
    if (selected === null) onApply(null);
    else if (!result?.data?.truncated && !debouncedQ && values.every((v) => selected.has(v))) onApply(null);
    else onApply({ key: column.key, values: [...selected] });
    onClose();
  }

  function applyContains() {
    const text = q.trim();
    if (!text) return;
    onApply({ key: column.key, text });
    onClose();
  }

  const hasFilter = !!filter && (!!filter.text || (filter.values?.length ?? 0) > 0);
  const label = (v: string) => (v === "" ? <span className="text-slate-400 italic">(Vides)</span> : (column.renderValue?.(v) ?? <span className="truncate">{v}</span>));

  return (
    <div className="flex max-h-[min(560px,80vh)] flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <p className="truncate font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">{column.label}</p>
        {hasFilter && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">Filtré</span>}
      </div>

      {column.sortable && (
        <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
          {(["asc", "desc"] as const).map((dir) => {
            const Icon = dir === "asc" ? ArrowUp : ArrowDown;
            const active = sortDir === dir;
            return (
              <button
                key={dir}
                onClick={() => {
                  onSort(active ? null : dir);
                  onClose();
                }}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold ring-1 transition ring-inset",
                  active ? "bg-brand-600 text-white ring-brand-600 shadow-glow" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className="size-3.5" />
                {dir === "asc" ? "Croissant" : "Décroissant"}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-3">
        <div className="group/search relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400 group-focus-within/search:text-brand-600" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (q.trim() && !touched ? applyContains : apply)();
            }}
            placeholder="Rechercher une valeur…"
            className="h-9 w-full rounded-lg bg-slate-50 pr-3 pl-8 text-sm ring-1 ring-slate-200 transition ring-inset placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-2.5 min-h-0 flex-1 border-t border-slate-100">
        {result?.error ? (
          <p className="px-4 py-6 text-center text-xs text-rose-600">{result.error}</p>
        ) : !result || (loading && entries.length === 0) ? (
          <div className="space-y-2.5 px-4 py-4">
            {[70, 50, 85, 40, 60].map((w) => (
              <div key={w} className="flex items-center gap-3">
                <Skeleton className="size-4 shrink-0" />
                <div className="skeleton h-3" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-400">Aucune valeur</p>
        ) : (
          <>
            <button
              onClick={toggleAll}
              role="menuitemcheckbox"
              aria-checked={allChecked ? "true" : someChecked ? "mixed" : "false"}
              className="group flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Checkbox1 checked={allChecked} indeterminate={!allChecked && someChecked} />
              {debouncedQ ? "Sélectionner les résultats" : "Tout sélectionner"}
              <span className="ml-auto font-medium text-slate-400 tabular-nums">{entries.length}</span>
            </button>
            <ul className={cn("scroll-thin max-h-64 overflow-y-auto px-1.5 pb-1.5 transition-opacity", loading && "opacity-50")}>
              {entries.map((e) => {
                const checked = isChecked(e.value);
                return (
                  <li key={e.value}>
                    <button
                      onClick={() => toggle(e.value)}
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span
                        className="absolute inset-y-1 left-0 rounded-lg bg-brand-50/80 transition-[width] duration-500"
                        style={{ width: `${(e.count / max) * 100}%` }}
                      />
                      <Checkbox1 checked={checked} className="relative" />
                      <span className="relative flex min-w-0 flex-1 items-center">{label(e.value)}</span>
                      <span className="relative text-xs font-medium text-slate-400 tabular-nums">{e.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {result.data?.truncated && <p className="px-4 pb-2 text-[11px] text-amber-700">Liste limitée : affinez la recherche.</p>}
          </>
        )}
      </div>

      {q.trim() && (
        <div className="border-t border-slate-100 px-1.5 py-1.5">
          <button
            onClick={applyContains}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <TextSearch className="size-4" />
            <span className="truncate">Contient « {q.trim()} »</span>
            <kbd className="ml-auto text-[10px] text-brand-400">Entrée</kbd>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <Button1
          variant="ghost"
          size="sm"
          leftIcon={<Eraser />}
          disabled={!hasFilter}
          onClick={() => {
            onApply(null);
            onClose();
          }}
        >
          Effacer
        </Button1>
        <Button1 size="sm" onClick={apply} disabled={selected !== null && selected.size === 0}>
          Appliquer
        </Button1>
      </div>
    </div>
  );
}
