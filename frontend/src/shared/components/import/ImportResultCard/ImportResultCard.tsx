"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, FilePlus2, FileX2, RefreshCw, Rows3, TriangleAlert } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { StatCard } from "@/shared/components/card/StatCard/StatCard";
import type { ImportResult } from "@/shared/types";
import { cn } from "@/shared/utils/cn";

interface ImportResultCardProps {
  result: ImportResult;
  onReset: () => void;
  /** Where "Voir les dossiers" leads. */
  dossiersHref?: string;
}

export function ImportResultCard({ result, onReset, dossiersHref = "/admin/suivi" }: ImportResultCardProps) {
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="surface relative overflow-hidden rounded-3xl"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0b1347_0%,#1a2a9c_50%,#2548ea_100%)] px-6 py-6 text-white">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 bg-[radial-gradient(circle,rgb(56_189_248/0.4),transparent_65%)]" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-sky-300 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15 ring-4 ring-white/10">
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="48" className="animate-draw" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.24em] text-sky-300 uppercase">Statut · succès</p>
            <p className="font-display text-xl font-semibold tracking-tight">Import terminé</p>
            <p className="truncate font-mono text-xs text-brand-100">{result.fileName}</p>
          </div>
          <Button1 variant="secondary" size="sm" leftIcon={<RefreshCw />} onClick={onReset}>
            Nouvel import
          </Button1>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Lignes lues" value={result.totalRows} tone="slate" icon={<Rows3 />} />
          <StatCard label="Nouveaux dossiers" value={result.createdRows} tone="emerald" icon={<FilePlus2 />} />
          <StatCard label="Mis à jour" value={result.updatedRows} tone="brand" icon={<RefreshCw />} />
          <StatCard label="Ignorées" value={result.skippedRows} tone="amber" icon={<FileX2 />} />
        </div>

        <div>
          <p className="mb-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
            Colonnes détectées · {result.columns.length}
            {result.newColumns.length > 0 && <span className="ml-2 text-emerald-600">{result.newColumns.length} nouvelle(s)</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.columns.map((c, i) => {
              const isNew = result.newColumns.includes(c);
              return (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.025 }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                    isNew ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-600 ring-slate-200",
                  )}
                >
                  {isNew && <span className="size-1.5 rounded-full bg-emerald-500" />}
                  {c}
                </motion.span>
              );
            })}
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-amber-50/70 ring-1 ring-amber-200">
            <button
              onClick={() => setShowWarnings((s) => !s)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-amber-900"
            >
              <TriangleAlert className="size-4" />
              {result.warnings.length} avertissement(s)
              <ChevronDown className={cn("ml-auto size-4 transition-transform", showWarnings && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {showWarnings && (
                <motion.ul
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="scroll-thin max-h-48 overflow-y-auto px-4 text-xs text-amber-800"
                >
                  {result.warnings.map((w, i) => (
                    <li key={i} className="border-t border-amber-200/60 py-1.5">
                      {w}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex justify-end">
          <LinkButton href={dossiersHref} variant="subtle">
            Voir les dossiers <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
          </LinkButton>
        </div>
      </div>
    </motion.section>
  );
}
