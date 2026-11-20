"use client";

import { useState } from "react";
import { BookOpen, Flag as FlagIcon, Hand, RotateCcw } from "lucide-react";
import { useFlags } from "../../../hooks/useFlags";
import { cn } from "../../../utils/cn";
import { IconButton } from "../../button/IconButton/IconButton";
import { Popover } from "../../popover/Popover/Popover";
import { FlagBadge } from "../FlagBadge/FlagBadge";

/** How each predefined flag is detected (Type de commande, Score client, Motif de sécurisation, Gardé en Main). */
const RULES: Record<string, string> = {
  P1: "« P1 » dans Score client, Motif ou Type de commande",
  P2: "« P2 » dans Score client, Motif ou Type de commande",
  MIG: "« migration » ou « MIG » dans Type de commande ou Motif",
  TH: "hauteur, nacelle ou « TH » (Motif, Type, Score client)",
  SECU: "Motif de sécurisation rempli, Type « sécuris… » ou Score « SECU »",
  GRE: "« GRE » dans Motif, Type de commande ou Score client",
  R1: "« rang 1 » ou « R1 »",
  R2: "« rang 2 » ou « R2 »",
  "R3&+": "« rang 3 », « R3&+ » ou « R3 »",
  RTI: "« rappel TI » ou « RTI »",
  GEM: "Gardé en Main = VRAI",
};

/** Table of every flag: code, meaning and (for predefined flags) the automatic rule. */
export function FlagLegendTable({ compact }: { compact?: boolean }) {
  const { flags } = useFlags();
  return (
    <div>
      <table className="w-full text-left">
        <thead>
          <tr className="font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
            <th className="py-2 pr-3 pl-4 font-medium">Code</th>
            <th className="py-2 pr-3 font-medium">Désignation</th>
            {!compact && <th className="py-2 pr-4 font-medium">Détection automatique</th>}
          </tr>
        </thead>
        <tbody>
          {flags.map((f, i) => (
            <tr key={f.code} className={cn("animate-row-in border-t border-slate-100")} style={{ animationDelay: `${i * 18}ms` }}>
              <td className="py-1.5 pr-3 pl-4">
                <FlagBadge code={f.code} flag={f} />
              </td>
              <td className="py-1.5 pr-3 text-[13px] font-medium text-slate-800">{f.label}</td>
              {!compact && (
                <td className="py-1.5 pr-4 text-[11.5px] text-slate-500">
                  {f.builtin ? RULES[f.code] ?? "Automatique" : <span className="italic">Drapeau personnalisé · ajouté à la main</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 space-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500">
        <p className="flex items-center gap-1.5">
          <Hand className="size-3 text-amber-600" /> Un dossier modifié à la main garde ses drapeaux, même après un nouvel import.
        </p>
        <p className="flex items-center gap-1.5">
          <RotateCcw className="size-3 text-brand-600" /> « Automatique » dans le menu d&apos;un dossier revient à la détection.
        </p>
      </div>
    </div>
  );
}

/** Button opening the legend (top bar, flag bar). */
export function FlagLegendButton({ variant = "icon" }: { variant?: "icon" | "chip" }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      {variant === "icon" ? (
        <IconButton variant="secondary" label="Légende des drapeaux" onClick={(e) => setAnchor(anchor ? null : e.currentTarget)} active={!!anchor}>
          <FlagIcon />
        </IconButton>
      ) : (
        <button
          type="button"
          onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50",
            anchor && "bg-brand-50",
          )}
        >
          <BookOpen className="size-3.5" /> Légende
        </button>
      )}
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={540} align="end">
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
          <FlagIcon className="size-4 text-brand-600" />
          <p className="font-display text-sm font-semibold text-slate-900">Les drapeaux</p>
          <p className="ml-auto text-[11px] text-slate-400">Ce que veut dire chaque code</p>
        </div>
        <div className="scroll-thin max-h-[70vh] overflow-y-auto">
          <FlagLegendTable />
        </div>
      </Popover>
    </>
  );
}
