"use client";

import { AnimatePresence, motion } from "motion/react";
import { ListFilter, Search, X } from "lucide-react";
import { PROGRESS_LABELS, SECTION_LABELS, type ColumnFilter, type FieldSection, type ProgressStatus } from "../../../types";
import { formatDate } from "../../../utils/date";
import { OP_LABELS } from "../FilterPopover/ConditionFilter";
import type { GridColumn } from "../DataGrid/types";

interface FilterChipsProps<T> {
  filters: ColumnFilter[];
  /** All columns (visible or not) to find the labels. */
  columns: GridColumn<T>[];
  search: string;
  onRemove: (key: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

function summary<T>(filter: ColumnFilter, column?: GridColumn<T>): string {
  if (filter.op === "between" || (!filter.op && (filter.from || filter.to))) {
    if (filter.from && filter.to) return filter.from === filter.to ? `le ${formatDate(filter.from)}` : `du ${formatDate(filter.from)} au ${formatDate(filter.to)}`;
    return filter.from ? `à partir du ${formatDate(filter.from)}` : `jusqu'au ${formatDate(filter.to ?? "")}`;
  }
  if (filter.op === "empty" || filter.op === "notEmpty") return OP_LABELS[filter.op].toLowerCase();
  if (filter.op && filter.text) return `${OP_LABELS[filter.op].toLowerCase()} « ${filter.text} »`;
  if (filter.text) return `contient « ${filter.text} »`;
  if (filter.key === "batch") return (filter.values ?? []).map((v) => `n° ${v}`).join(", ");
  if (filter.key.startsWith("status:")) return (filter.values ?? []).map((v) => PROGRESS_LABELS[v as ProgressStatus] ?? v).join(", ");
  const values = (filter.values ?? []).map((v) => (v === "" ? "(Vides)" : (column?.formatValue?.(v) ?? v)));
  const shown = values.slice(0, 2).join(", ");
  return values.length > 2 ? `${shown} +${values.length - 2}` : shown;
}

/**
 * Active filters as removable chips.
 * The bar itself does not animate its height (that would re-layout the table on every frame):
 * only the chips animate, with transform / opacity.
 */
export function FilterChips<T>({ filters, columns, search, onRemove, onClearSearch, onClearAll }: FilterChipsProps<T>) {
  const count = filters.length + (search ? 1 : 0);
  if (count === 0) return null;

  return (
    <div className="flex animate-fade-in flex-wrap items-center gap-2 border-t border-slate-100 bg-linear-to-r from-brand-50/60 to-transparent px-4 py-2.5">
      <span className="mr-1 font-mono text-[10px] font-medium tracking-[0.2em] text-brand-600/80 uppercase">Filtres · {count}</span>
      <AnimatePresence initial={false}>
        {search && <Chip key="__search" icon={<Search className="size-3" />} label="ID Externe" value={`contient « ${search} »`} onRemove={onClearSearch} />}
        {filters.map((f) => {
          const column = columns.find((c) => c.key === f.key);
          return (
            <Chip
              key={f.key}
              icon={<ListFilter className="size-3" />}
              label={column?.label ?? (f.key === "batch" ? "Fichier" : f.key.startsWith("status:") ? `Avancement ${SECTION_LABELS[f.key.slice(7) as FieldSection] ?? ""}` : f.key)}
              value={summary(f, column)}
              onRemove={() => onRemove(f.key)}
            />
          );
        })}
      </AnimatePresence>
      {count > 1 && (
        <button onClick={onClearAll} className="ml-1 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-rose-600 hover:underline">
          Tout effacer
        </button>
      )}
    </div>
  );
}

function Chip({ icon, label, value, onRemove }: { icon: React.ReactNode; label: string; value: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-white pr-1 pl-2.5 text-xs shadow-[inset_0_1px_0_#fff,0_4px_12px_-6px_rgb(37_72_234/0.35)] ring-1 ring-brand-200/80"
    >
      <span className="text-sky-500">{icon}</span>
      <span className="font-semibold whitespace-nowrap text-brand-900">{label}</span>
      <span className="max-w-56 truncate text-slate-500">{value}</span>
      <button
        onClick={onRemove}
        className="grid size-5 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Retirer le filtre ${label}`}
      >
        <X className="size-3" />
      </button>
    </motion.span>
  );
}
