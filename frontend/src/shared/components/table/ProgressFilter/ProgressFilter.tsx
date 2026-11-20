"use client";

import { useEffect, useState } from "react";
import { CircleCheckBig, CircleDashed, CircleDot, Info, type LucideIcon } from "lucide-react";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import { dossierService } from "../../../services/dossierService";
import { PROGRESS_LABELS, SECTION_LABELS, type FieldSection, type ProgressStatus } from "../../../types";
import { cn } from "../../../utils/cn";

const STATUSES: { value: ProgressStatus; icon: LucideIcon; on: string; dot: string }[] = [
  { value: "UNTOUCHED", icon: CircleDashed, on: "bg-slate-800 text-white ring-slate-800", dot: "text-slate-400" },
  { value: "IN_PROGRESS", icon: CircleDot, on: "bg-amber-500 text-white ring-amber-500", dot: "text-amber-500" },
  { value: "DONE", icon: CircleCheckBig, on: "bg-emerald-600 text-white ring-emerald-600", dot: "text-emerald-600" },
];

const RULE =
  "Non touché : aucune valeur saisie dans la section. En cours : au moins une valeur, mais pas terminé. " +
  "Traité : la valeur finale est saisie (Sécurisation : Etat final), sinon toutes les listes de la section sont remplies.";

/**
 * Quick filter on the progress of the dossiers, one group per section of the table:
 * Non touchés / En cours / Traités, with live counts (other filters applied). Several can be combined.
 */
export function ProgressFilter({ grid, sections }: { grid: DossierGrid; sections: FieldSection[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 px-4 py-2.5">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-500 uppercase" title={RULE}>
        Avancement <Info className="size-3 text-slate-400" />
      </span>
      {sections.map((s) => (
        <SectionProgress key={s} grid={grid} section={s} showLabel={sections.length > 1} />
      ))}
    </div>
  );
}

function SectionProgress({ grid, section, showLabel }: { grid: DossierGrid; section: FieldSection; showLabel: boolean }) {
  const key = `status:${section}`;
  const { date, search, filters } = grid.criteria;
  const statsToken = grid.statsToken;
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const active = filters.find((f) => f.key === key)?.values ?? [];

  useEffect(() => {
    let cancelled = false;
    dossierService
      .facets({ date, search, filters, sort: null, page: 0, size: 1 }, key, "")
      .then((f) => !cancelled && setCounts(Object.fromEntries(f.values.map((v) => [v.value, v.count]))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [date, search, filters, key, statsToken]);

  function toggle(v: ProgressStatus) {
    const next = active.includes(v) ? active.filter((x) => x !== v) : [...active, v];
    grid.setFilter(key, next.length ? { key, values: next } : null);
  }

  return (
    <div className="flex items-center gap-1.5">
      {showLabel && <span className="mr-0.5 text-[11px] font-semibold text-slate-600">{SECTION_LABELS[section]}</span>}
      {STATUSES.map(({ value, icon: Icon, on, dot }) => {
        const selected = active.includes(value);
        const n = counts?.[value];
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            aria-pressed={selected}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold ring-1 transition-all duration-200 ease-out-expo",
              selected ? cn(on, "shadow-[0_8px_18px_-10px_rgb(15_23_42/0.6)]") : "bg-white text-slate-600 ring-slate-200 hover:-translate-y-px hover:ring-slate-300",
            )}
          >
            <Icon className={cn("size-3.5", !selected && dot)} />
            {PROGRESS_LABELS[value]}
            <span className={cn("rounded-full px-1.5 font-mono text-[10px] tabular-nums", selected ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
              {n ?? "…"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
