"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import { dossierService } from "../../../services/dossierService";
import { DELAY_LABELS, type Delay, type FacetResponse } from "../../../types";
import { cn } from "../../../utils/cn";
import { DELAY_TONE } from "../../../utils/delayTone";

const SHOWN: Delay[] = ["LATE", "SOON", "ON_TIME", "DONE"];

/**
 * Delay counters of the current table: red = after J+1 12:00, orange = J+1 morning, green = closed.
 * Click one to filter the table on it (several = any of them).
 */
export function DelayStrip({ grid }: { grid: DossierGrid }) {
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const { date, search, filters } = grid.criteria;
  const active = filters.find((f) => f.key === "delay")?.values ?? [];
  const statsToken = grid.statsToken;

  useEffect(() => {
    let cancelled = false;
    dossierService
      .facets({ date, search, filters, sort: null, page: 0, size: 1 }, "delay", "")
      .then((f) => !cancelled && setFacets(f))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [date, search, filters, statsToken]);

  const counts = new Map((facets?.values ?? []).map((v) => [v.value, v.count]));

  function toggle(delay: Delay) {
    const next = active.includes(delay) ? active.filter((d) => d !== delay) : [...active, delay];
    grid.setFilter("delay", next.length ? { key: "delay", values: next } : null);
  }

  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase sm:inline-flex">
        <Clock3 className="size-3.5 text-cyan-300" /> Délai
      </span>
      <div className="scroll-thin -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1">
        {SHOWN.map((d) => {
          const n = counts.get(d) ?? 0;
          const on = active.includes(d);
          const tone = DELAY_TONE[d];
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(d)}
              title={`${DELAY_LABELS[d]} · ${n} dossier(s)`}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-xl px-2.5 ring-1 ring-inset transition-[box-shadow,background-color] duration-200",
                on ? cn(tone ? tone.chip : "bg-slate-100 text-slate-700 ring-slate-300", "ring-2") : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
                n === 0 && !on && "opacity-55",
              )}
            >
              <span className={cn("size-2 rounded-full", tone ? tone.dot : "bg-slate-400")} />
              <span className="text-xs font-semibold">{DELAY_LABELS[d]}</span>
              <span className="rounded-md bg-slate-900/5 px-1.5 font-mono text-[11px] font-bold tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
