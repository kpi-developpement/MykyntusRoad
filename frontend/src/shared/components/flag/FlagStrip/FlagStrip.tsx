"use client";

import { useEffect, useState } from "react";
import { Flag as FlagIcon, X } from "lucide-react";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import { useFlags } from "../../../hooks/useFlags";
import { dossierService } from "../../../services/dossierService";
import type { FacetResponse } from "../../../types";
import { cn } from "../../../utils/cn";
import { flagTone } from "../../../utils/flagColors";

/**
 * Flag counters of the current table (date, search and other filters applied).
 * Click a flag to filter the table on it (several = any of them), click again to remove it.
 */
export function FlagStrip({ grid }: { grid: DossierGrid }) {
  const { flags } = useFlags();
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const { date, search, filters } = grid.criteria;
  const active = filters.find((f) => f.key === "flags")?.values ?? [];
  const statsToken = grid.statsToken;

  useEffect(() => {
    let cancelled = false;
    dossierService
      .facets({ date, search, filters, sort: null, page: 0, size: 1 }, "flags", "")
      .then((f) => !cancelled && setFacets(f))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [date, search, filters, statsToken]);

  const counts = new Map((facets?.values ?? []).map((v) => [v.value, v.count]));
  const max = Math.max(1, ...counts.values());

  function toggle(code: string) {
    const next = active.includes(code) ? active.filter((c) => c !== code) : [...active, code];
    grid.setFilter("flags", next.length ? { key: "flags", values: next } : null);
  }

  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-500 uppercase sm:inline-flex">
        <FlagIcon className="size-3.5 text-brand-500" /> Drapeaux
      </span>
      <div className="scroll-thin -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1.5 [perspective:700px]">
        {flags.map((f, i) => {
          const n = counts.get(f.code) ?? 0;
          const on = active.includes(f.code);
          const tone = flagTone(f.color);
          return (
            <button
              key={f.code}
              type="button"
              onClick={() => toggle(f.code)}
              aria-pressed={on}
              title={`${f.label} · ${n} dossier(s)`}
              style={{ animationDelay: `${i * 25}ms` }}
              className={cn(
                "group relative flex h-9 shrink-0 animate-slide-up items-center gap-2 overflow-hidden rounded-xl pr-2.5 pl-2 ring-1 ring-inset",
                "transition-[transform,box-shadow,background-color] duration-300 ease-out-expo [transform-style:preserve-3d]",
                "hover:[transform:translateY(-2px)_rotateX(10deg)]",
                on ? cn(tone.chip, "shadow-[0_10px_22px_-12px_currentColor] ring-2") : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
                n === 0 && !on && "opacity-55",
              )}
            >
              <span className={cn("size-2 rounded-full", tone.solid)} />
              <span className="font-mono text-[11px] font-bold">{f.code}</span>
              <span className="min-w-5 rounded-md bg-slate-900/[0.05] px-1 text-center font-mono text-[10.5px] tabular-nums">{n}</span>
              {/* proportion bar */}
              <span
                aria-hidden
                className={cn("absolute bottom-0 left-0 h-[2px] origin-left transition-transform duration-500 ease-out-expo", tone.solid)}
                style={{ width: "100%", transform: `scaleX(${n / max})` }}
              />
            </button>
          );
        })}
      </div>
      {active.length > 0 && (
        <button
          type="button"
          onClick={() => grid.setFilter("flags", null)}
          className="inline-flex h-8 shrink-0 animate-fade-in items-center gap-1 rounded-lg px-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
        >
          <X className="size-3.5" /> Drapeaux
        </button>
      )}
    </div>
  );
}
