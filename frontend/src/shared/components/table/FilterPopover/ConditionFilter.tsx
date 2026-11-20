"use client";

import { useState } from "react";
import { CalendarRange, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ColumnFilter, FilterOp } from "../../../types";
import { cn } from "../../../utils/cn";
import { today, tomorrow } from "../../../utils/date";

export const OP_LABELS: Record<FilterOp, string> = {
  contains: "Contient",
  notContains: "Ne contient pas",
  equals: "Est égal à",
  notEquals: "Est différent de",
  startsWith: "Commence par",
  endsWith: "Se termine par",
  empty: "Est vide",
  notEmpty: "N'est pas vide",
  between: "Entre deux dates",
};

const TEXT_OPS: FilterOp[] = ["contains", "notContains", "equals", "notEquals", "startsWith", "endsWith", "empty", "notEmpty"];
const NO_TEXT: FilterOp[] = ["empty", "notEmpty", "between"];

function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ConditionFilterProps {
  columnKey: string;
  kind: "text" | "date" | "enum";
  filter?: ColumnFilter;
  onApply: (filter: ColumnFilter) => void;
}

/**
 * Advanced filters of a column: text conditions (contains, does not contain, equals, starts with,
 * ends with, empty, not empty) and, for date columns, a date range with shortcuts.
 */
export function ConditionFilter({ columnKey, kind, filter, onApply }: ConditionFilterProps) {
  const active = !!filter?.op || !!filter?.from || !!filter?.to;
  const [open, setOpen] = useState(active);
  const [tab, setTab] = useState<"text" | "date">(kind === "date" && (filter?.op === "between" || !filter?.op) ? "date" : "text");
  const [op, setOp] = useState<FilterOp>(filter?.op && filter.op !== "between" ? filter.op : "contains");
  const [text, setText] = useState(filter?.op && filter.op !== "between" ? (filter.text ?? "") : "");
  const [from, setFrom] = useState(filter?.from ?? "");
  const [to, setTo] = useState(filter?.to ?? "");
  const isDate = kind === "date";
  const needsText = !NO_TEXT.includes(op);

  function applyText() {
    if (needsText && !text.trim()) return;
    onApply({ key: columnKey, op, text: needsText ? text.trim() : null });
  }

  function applyRange(f = from, t = to) {
    if (!f && !t) return;
    onApply({ key: columnKey, op: "between", from: f || null, to: t || null });
  }

  const t0 = today();
  const shortcuts: { label: string; from: string; to: string }[] = [
    { label: "Aujourd'hui", from: t0, to: t0 },
    { label: "Demain", from: tomorrow(), to: tomorrow() },
    { label: "7 derniers jours", from: shift(t0, -6), to: t0 },
    { label: "7 prochains jours", from: t0, to: shift(t0, 6) },
    { label: "30 derniers jours", from: shift(t0, -29), to: t0 },
  ];

  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <SlidersHorizontal className="size-3.5 text-brand-500" />
        Filtres avancés
        {active && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">actif</span>}
        <ChevronDown className={cn("ml-auto size-3.5 text-slate-400 transition-transform duration-300", open && "rotate-180")} />
      </button>

      {open && (
        <div className="animate-fade-in px-3 pb-3">
          {isDate && (
            <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5">
              {(["date", "text"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1.5 rounded-md text-[11px] font-semibold transition",
                    tab === t ? "bg-white text-brand-700 shadow-soft" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {t === "date" ? <CalendarRange className="size-3.5" /> : <SlidersHorizontal className="size-3.5" />}
                  {t === "date" ? "Période" : "Condition"}
                </button>
              ))}
            </div>
          )}

          {isDate && tab === "date" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  Du
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg bg-slate-50 px-2 font-mono text-xs text-slate-800 ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </label>
                <label className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  Au
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg bg-slate-50 px-2 font-mono text-xs text-slate-800 ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-1">
                {shortcuts.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setFrom(s.from);
                      setTo(s.to);
                      applyRange(s.from, s.to);
                    }}
                    className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!from && !to}
                onClick={() => applyRange()}
                className="h-8 w-full rounded-lg bg-brand-600 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                Filtrer sur la période
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={op}
                onChange={(e) => setOp(e.target.value as FilterOp)}
                aria-label="Condition"
                className="h-8 w-full rounded-lg bg-slate-50 px-2 text-xs font-medium text-slate-800 ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {TEXT_OPS.map((o) => (
                  <option key={o} value={o}>
                    {OP_LABELS[o]}
                  </option>
                ))}
              </select>
              {needsText && (
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      applyText();
                    }
                  }}
                  placeholder="Valeur…"
                  className="h-8 w-full rounded-lg bg-slate-50 px-2 text-xs ring-1 ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              )}
              <button
                type="button"
                disabled={needsText && !text.trim()}
                onClick={applyText}
                className="h-8 w-full rounded-lg bg-brand-600 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                Appliquer la condition
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
