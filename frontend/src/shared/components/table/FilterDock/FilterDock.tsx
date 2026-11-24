"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ListFilter, X } from "lucide-react";
import { DELAY_LABELS, PROGRESS_LABELS, SECTION_LABELS, type ColumnFilter, type Delay, type FieldSection, type ProgressStatus } from "../../../types";
import { formatDate } from "../../../utils/date";
import type { GridColumn } from "../DataGrid/types";
import { OP_LABELS } from "../FilterPopover/ConditionFilter";
import styles from "./FilterDock.module.css";

interface FilterDockProps<T> {
  filters: ColumnFilter[];
  columns: GridColumn<T>[];
  search: string;
  onRemove: (key: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

/** "Délai", "Fichier", "Avancement J"... */
export function filterLabel<T>(f: ColumnFilter, column?: GridColumn<T>): string {
  if (column) return column.label;
  if (f.key === "batch") return "Fichier";
  if (f.key === "delay") return "Délai";
  if (f.key === "route") return "Équipe J-1";
  if (f.key.startsWith("status:")) return `Avancement ${SECTION_LABELS[f.key.slice(7) as FieldSection] ?? ""}`;
  if (f.key.startsWith("assignee")) return "Attribué à";
  return f.key;
}

/** What the filter keeps, in words. */
export function filterValue<T>(f: ColumnFilter, column?: GridColumn<T>): string {
  if (f.op === "between" || (!f.op && (f.from || f.to))) {
    if (f.from && f.to) return f.from === f.to ? `le ${formatDate(f.from)}` : `du ${formatDate(f.from)} au ${formatDate(f.to)}`;
    return f.from ? `à partir du ${formatDate(f.from)}` : `jusqu'au ${formatDate(f.to ?? "")}`;
  }
  if (f.op === "empty" || f.op === "notEmpty") return OP_LABELS[f.op].toLowerCase();
  if (f.op && f.text) return `${OP_LABELS[f.op].toLowerCase()} « ${f.text} »`;
  if (f.text) return `contient « ${f.text} »`;
  const values = (f.values ?? []).map((v) => {
    if (v === "") return "(Vides)";
    if (f.key === "batch") return `n° ${v}`;
    if (f.key === "delay") return DELAY_LABELS[v as Delay] ?? v;
    if (f.key.startsWith("status:")) return PROGRESS_LABELS[v as ProgressStatus] ?? v;
    return column?.formatValue?.(v) ?? v;
  });
  const shown = values.slice(0, 2).join(", ");
  return values.length > 2 ? `${shown} +${values.length - 2}` : shown;
}

/**
 * Floating dock at the bottom of the screen while the table is filtered: how many filters, each one
 * removable, and "Tout effacer". Always in sight, whatever the scroll position.
 */
export function FilterDock<T>({ filters, columns, search, onRemove, onClearSearch, onClearAll }: FilterDockProps<T>) {
  const reduce = useReducedMotion();
  const count = filters.length + (search ? 1 : 0);
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          role="region"
          aria-label="Filtres actifs"
          className={styles.dock}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.15, ease: [0.7, 0, 0.84, 0] } }}
          transition={{ type: "spring", stiffness: 460, damping: 40 }}
          layout
        >
          <span className={styles.badge}>
            <ListFilter aria-hidden />
            Filtres
            <motion.span key={count} className={styles.count} initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }}>
              {count}
            </motion.span>
          </span>
          <div className={styles.chips}>
            <AnimatePresence initial={false} mode="popLayout">
              {search && <Chip key="__search" label="ID Externe" value={`contient « ${search} »`} onRemove={onClearSearch} />}
              {filters.map((f) => {
                const column = columns.find((c) => c.key === f.key);
                return <Chip key={f.key} label={filterLabel(f, column)} value={filterValue(f, column)} onRemove={() => onRemove(f.key)} />;
              })}
            </AnimatePresence>
          </div>
          <button type="button" className={styles.clear} onClick={onClearAll}>
            Tout effacer
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Chip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      className={styles.chip}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      title={`${label} : ${value}`}
    >
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue}>{value}</span>
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Retirer le filtre ${label}`}>
        <X />
      </button>
    </motion.span>
  );
}
