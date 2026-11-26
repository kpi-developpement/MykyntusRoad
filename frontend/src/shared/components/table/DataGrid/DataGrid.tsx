"use client";

import { useMemo, useState } from "react";
import { cn } from "../../../utils/cn";
import type { ColumnFilter, FacetResponse, SortSpec } from "../../../types";
import { ColumnHeader } from "../ColumnHeader/ColumnHeader";
import type { Density, GridColumn, GridGroup } from "./types";

interface DataGridProps<T> {
  /** Visible columns, pinned ones first. */
  columns: GridColumn<T>[];
  groups?: GridGroup[];
  rows: T[];
  rowKey: (row: T) => React.Key;
  /** Reloading while data is displayed. */
  loading: boolean;
  /** First load (no data yet). */
  initialLoading: boolean;
  /** Changes on every load to replay the row entrance animation. */
  version: number;
  density: Density;
  sort: SortSpec | null;
  onSortChange: (sort: SortSpec | null) => void;
  filters: ColumnFilter[];
  onFilterChange: (key: string, filter: ColumnFilter | null) => void;
  loadFacets: (key: string, q: string) => Promise<FacetResponse>;
  empty: React.ReactNode;
  maxHeight?: string;
  /** Rows shown greyed out (e.g. dossiers that are not the pilot's own). */
  rowMuted?: (row: T) => boolean;
  /** Tooltip of a greyed out row. */
  mutedTitle?: string;
  /** Rows highlighted (dossiers the connected pilot works on). */
  rowMine?: (row: T) => boolean;
}

const DEFAULT_SUBHEADER = "bg-brand-50 text-brand-950";
const PINNED_HEADER = "bg-[linear-gradient(180deg,#14206e,#0b1347)] text-white";
const SKELETON_ROWS = 9;
/** Only the rows visible on load are animated (fewer GPU layers at the same time). */
const ANIMATED_ROWS = 20;
/** Permanent bar on the left of the rows the pilot works on. */
const MINE_ACCENT = "after:absolute after:inset-y-1.5 after:left-0 after:w-[3px] after:rounded-r-full after:bg-emerald-500";
/** Neon bar on the left of the hovered row. */
const ROW_ACCENT =
  "before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r-full before:bg-linear-to-b before:from-sky-400 before:to-brand-600 before:opacity-0 before:transition-opacity group-hover/row:before:opacity-100";

/**
 * Table with sticky header, pinned left columns, grouped headers,
 * per-column sort / filter, skeleton loading and animated rows.
 */
export function DataGrid<T>({
  columns,
  groups,
  rows,
  rowKey,
  loading,
  initialLoading,
  version,
  density,
  sort,
  onSortChange,
  filters,
  onFilterChange,
  loadFacets,
  empty,
  maxHeight = "calc(100dvh - 15rem)",
  rowMuted,
  mutedTitle = "Dossier non attribué à vous : lecture seule",
  rowMine,
}: DataGridProps<T>) {
  const [scrolledX, setScrolledX] = useState(false);

  const pinned = columns.filter((c) => c.pinned);
  const others = columns.filter((c) => !c.pinned);
  const ordered = [...pinned, ...others];
  const lastPinnedKey = pinned.at(-1)?.key;
  const totalWidth = ordered.reduce((sum, c) => sum + c.width, 0);

  const offsets = useMemo(() => {
    const map: Record<string, number> = {};
    let left = 0;
    for (const c of columns.filter((col) => col.pinned)) {
      map[c.key] = left;
      left += c.width;
    }
    return map;
  }, [columns]);

  const groupById = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups]);
  const hasGroups = others.some((c) => c.groupId && groupById.has(c.groupId));

  // consecutive columns of the same group share one header cell
  const spans: { key: string; group?: GridGroup; span: number }[] = [];
  for (const c of others) {
    const last = spans.at(-1);
    if (last && last.group?.id === c.groupId) last.span++;
    else spans.push({ key: c.key, group: c.groupId ? groupById.get(c.groupId) : undefined, span: 1 });
  }

  const filterOf = (key: string) => filters.find((f) => f.key === key);
  const cellPad = density === "compact" ? "h-10 py-1" : "h-[52px] py-2";

  const pinnedHeader = (c: GridColumn<T>, rowSpan?: number) => (
    <ColumnHeader
      key={c.key}
      column={c}
      dark
      rowSpan={rowSpan}
      sort={sort}
      filter={filterOf(c.key)}
      onSortChange={onSortChange}
      onFilterChange={onFilterChange}
      loadFacets={loadFacets}
      style={{ left: offsets[c.key] }}
      className={cn(
        "sticky z-30 border-b border-brand-950/40",
        PINNED_HEADER,
        c.key === lastPinnedKey && "border-r border-r-white/10",
        c.key === lastPinnedKey && scrolledX && "shadow-pin",
      )}
    />
  );

  return (
    <div className="relative">
      {loading && !initialLoading && (
        <div className="absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-brand-100/60">
          <div className="h-full w-1/3 animate-progress bg-linear-to-r from-transparent via-sky-400 to-transparent" />
        </div>
      )}
      <div
        className="scroll-thin relative overflow-auto overscroll-contain"
        style={{ maxHeight }}
        onScroll={(e) => {
          const next = e.currentTarget.scrollLeft > 2;
          if (next !== scrolledX) setScrolledX(next);
        }}
      >
        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: totalWidth, minWidth: "100%" }}>
          <colgroup>
            {ordered.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20">
            {hasGroups && (
              <tr>
                {pinned.map((c) => pinnedHeader(c, 2))}
                {spans.map((s) => (
                  <th
                    key={s.key}
                    colSpan={s.span}
                    className={cn(
                      "relative h-9 overflow-hidden border-r border-white/20 px-3 text-center font-mono text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase",
                      s.group?.headerClassName ?? PINNED_HEADER,
                    )}
                  >
                    <span aria-hidden className="stripes absolute inset-0" />
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/60 to-transparent" />
                    <span className="relative">{s.group?.label}</span>
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {!hasGroups && pinned.map((c) => pinnedHeader(c))}
              {others.map((c) => (
                <ColumnHeader
                  key={c.key}
                  column={c}
                  sort={sort}
                  filter={filterOf(c.key)}
                  onSortChange={onSortChange}
                  onFilterChange={onFilterChange}
                  loadFacets={loadFacets}
                  className={cn(
                    "border-r border-b border-slate-200/70",
                    (c.groupId && groupById.get(c.groupId)?.subHeaderClassName) || DEFAULT_SUBHEADER,
                  )}
                />
              ))}
            </tr>
          </thead>

          <tbody key={version} className={cn("transition-opacity duration-300", loading && !initialLoading && "opacity-60")}>
            {initialLoading
              ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <tr key={i}>
                    {ordered.map((c, j) => (
                      <td
                        key={c.key}
                        style={c.pinned ? { left: offsets[c.key] } : undefined}
                        className={cn("border-b border-slate-100 bg-white px-3", cellPad, c.pinned && "sticky z-10")}
                      >
                        <div className="skeleton h-3.5" style={{ width: `${35 + ((i * 17 + j * 29) % 55)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => {
                  const muted = rowMuted?.(row) ?? false;
                  const mine = !muted && (rowMine?.(row) ?? false);
                  return (
                  <tr
                    key={rowKey(row)}
                    title={muted ? mutedTitle : undefined}
                    className={cn(
                      "group/row",
                      i < ANIMATED_ROWS && "animate-row-in",
                      // the "bright" cells (ID, pilot) stay readable: that is where a pilot joins the dossier
                      muted && "[&>td]:bg-slate-50 [&>td:not([data-bright])>*]:opacity-55",
                    )}
                    style={i < ANIMATED_ROWS ? { animationDelay: `${i * 16}ms` } : undefined}
                  >
                    {ordered.map((c, j) => (
                      <td
                        key={c.key}
                        data-bright={c.bright ? "" : undefined}
                        style={c.pinned ? { left: offsets[c.key] } : undefined}
                        className={cn(
                          "border-b border-slate-100 bg-white px-2.5 align-middle transition-colors duration-150 group-hover/row:bg-row-hover",
                          cellPad,
                          c.pinned ? "sticky z-10" : j === 0 && "relative",
                          j === 0 && ROW_ACCENT,
                          j === 0 && mine && MINE_ACCENT,
                          c.key === lastPinnedKey && "border-r border-r-slate-200/80",
                          c.key === lastPinnedKey && scrolledX && "shadow-pin",
                        )}
                      >
                        {c.render(row, i)}
                      </td>
                    ))}
                  </tr>
                  );
                })}
          </tbody>
        </table>
        {!initialLoading && !loading && rows.length === 0 && <div className="sticky left-0 w-full">{empty}</div>}
      </div>
    </div>
  );
}
