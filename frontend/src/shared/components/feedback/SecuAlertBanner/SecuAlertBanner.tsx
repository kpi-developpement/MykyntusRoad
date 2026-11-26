"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ListFilter, ShieldAlert, X } from "lucide-react";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import { cn } from "../../../utils/cn";

const KEY = "secu";
const VALUES = ["J_MINUS_1", "J"];

/**
 * The day before the appointment, the dossiers whose sécurisation is not done yet ("Etat final" empty)
 * are declared here: how many, and one click to show only them.
 */
export function SecuAlertBanner({ grid }: { grid: DossierGrid }) {
  const reduce = useReducedMotion();
  const pending = grid.stats?.secuPending ?? 0;
  const active = grid.criteria.filters.some((f) => f.key === KEY);
  const show = pending > 0 || active;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className={cn(
            "relative mb-5 flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 ring-1",
            pending > 0 ? "bg-linear-to-r from-amber-50 via-white to-rose-50 ring-amber-200" : "bg-emerald-50/70 ring-emerald-200",
          )}
        >
          <span
            className={cn(
              "relative grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm",
              pending > 0 ? "bg-linear-to-br from-amber-500 to-rose-500" : "bg-emerald-500",
            )}
          >
            <ShieldAlert className="size-5" />
            {pending > 0 && !reduce && <span aria-hidden className="absolute inset-0 animate-ping rounded-xl ring-2 ring-amber-300 [animation-duration:2.4s]" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-slate-900">
              {pending > 0 ? (
                <>
                  <span className="tabular-nums">{pending}</span> dossier{pending > 1 ? "s" : ""} pas encore sécurisé{pending > 1 ? "s" : ""}
                </>
              ) : (
                "Tous les dossiers à sécuriser le sont"
              )}
            </p>
            <p className="text-xs text-slate-600">
              Rendez-vous demain (ou aujourd&apos;hui) et « Etat final » toujours vide : à traiter en priorité.
            </p>
          </div>
          {active ? (
            <button
              type="button"
              onClick={() => grid.setFilter(KEY, null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:text-rose-600 hover:ring-rose-200"
            >
              <X className="size-3.5" /> Tout afficher
            </button>
          ) : (
            <button
              type="button"
              onClick={() => grid.setFilter(KEY, { key: KEY, values: VALUES })}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <ListFilter className="size-3.5" /> Afficher ces dossiers
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
