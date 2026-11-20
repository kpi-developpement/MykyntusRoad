"use client";

import { useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter } from "lucide-react";
import { cn } from "../../../utils/cn";
import type { ColumnFilter, FacetResponse, SortSpec } from "../../../types";
import { FilterPopover } from "../FilterPopover/FilterPopover";
import type { GridColumn } from "../DataGrid/types";

interface ColumnHeaderProps<T> {
  column: GridColumn<T>;
  sort: SortSpec | null;
  filter?: ColumnFilter;
  onSortChange: (sort: SortSpec | null) => void;
  onFilterChange: (key: string, filter: ColumnFilter | null) => void;
  loadFacets: (key: string, q: string) => Promise<FacetResponse>;
  className?: string;
  style?: CSSProperties;
  rowSpan?: number;
  /** Header on a dark background (pinned columns). */
  dark?: boolean;
}

export function ColumnHeader<T>({
  column,
  sort,
  filter,
  onSortChange,
  onFilterChange,
  loadFacets,
  className,
  style,
  rowSpan,
  dark,
}: ColumnHeaderProps<T>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const sortDir = sort?.key === column.key ? sort.direction : null;
  const filtered = !!filter && (!!filter.text || !!filter.op || !!filter.from || !!filter.to || (filter.values?.length ?? 0) > 0);

  const cycleSort = () =>
    onSortChange(
      sortDir === null ? { key: column.key, direction: "asc" } : sortDir === "asc" ? { key: column.key, direction: "desc" } : null,
    );

  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      rowSpan={rowSpan}
      style={style}
      aria-sort={sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : undefined}
      className={cn("group/th h-11 px-2.5 text-left align-middle text-xs font-semibold whitespace-nowrap", className)}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!column.sortable}
          onClick={cycleSort}
          title={column.sortable ? `Trier par ${column.label}` : column.label}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 py-1 text-left disabled:cursor-default"
        >
          <span className="truncate">{column.label}</span>
          {column.sortable && (
            <SortIcon
              key={sortDir ?? "none"}
              className={cn(
                "size-3.5 shrink-0 transition-opacity",
                sortDir ? "animate-pop opacity-100" : "opacity-0 group-hover/th:opacity-50",
              )}
            />
          )}
        </button>
        {column.filterable && (
          <button
            type="button"
            onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
            aria-label={`Filtrer la colonne ${column.label}`}
            aria-expanded={!!anchor}
            className={cn(
              "relative grid size-6 shrink-0 place-items-center rounded-md transition-all duration-200",
              filtered
                ? dark
                  ? "bg-white text-brand-700"
                  : "bg-brand-600 text-white shadow-glow"
                : dark
                  ? "text-white/60 hover:bg-white/15 hover:text-white"
                  : "text-slate-400 opacity-70 group-hover/th:opacity-100 hover:bg-white hover:text-brand-700 hover:shadow-soft",
              anchor && !filtered && (dark ? "bg-white/15 text-white" : "bg-white text-brand-700 opacity-100 shadow-soft"),
            )}
          >
            <ListFilter className="size-3.5" />
            {filtered && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-white" />}
          </button>
        )}
      </div>
      {column.filterable && (
        <FilterPopover
          anchor={anchor}
          onClose={() => setAnchor(null)}
          column={column}
          filter={filter}
          sortDir={sortDir}
          onSort={(direction) => onSortChange(direction ? { key: column.key, direction } : null)}
          onApply={(f) => onFilterChange(column.key, f)}
          loadFacets={loadFacets}
        />
      )}
    </th>
  );
}
