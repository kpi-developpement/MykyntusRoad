"use client";

import { useState } from "react";
import { Check, ChevronDown, UserMinus, UserRound } from "lucide-react";
import type { DossierRow, Pilote } from "../../../types";
import { cn } from "../../../utils/cn";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { Popover } from "../../popover/Popover/Popover";

interface AssigneeCellProps {
  row: DossierRow;
  /** Pilots known by the screen (sécurisation admin), used for names and reassignment. */
  pilotes: Pilote[] | null;
  editable: boolean;
  onAssign: (row: DossierRow, pilote: string | null) => Promise<void>;
}

export function piloteName(username: string | null, pilotes: Pilote[] | null): string {
  if (!username) return "";
  return pilotes?.find((p) => p.username === username)?.fullName || username;
}

/** Pilot the dossier is dispatched to. The sécurisation admin changes it in one click. */
export function AssigneeCell({ row, pilotes, editable, onAssign }: AssigneeCellProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const name = piloteName(row.assignedTo, pilotes);

  const display = row.assignedTo ? (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-slate-700" title={name}>
      <Avatar1 name={name} size="sm" className="size-5 text-[8px] ring-1" />
      <span className="truncate">{name}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-400">
      <UserRound className="size-3" /> Non attribué
    </span>
  );

  if (!editable) return <span className="flex h-8 items-center px-1">{display}</span>;

  async function choose(pilote: string | null) {
    setAnchor(null);
    if (pilote === row.assignedTo) return;
    setBusy(true);
    try {
      await onAssign(row, pilote);
    } finally {
      setBusy(false);
    }
  }

  const active = (pilotes ?? []).filter((p) => p.active);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        className={cn(
          "group/as flex h-8 w-full items-center gap-1 rounded-lg px-1 text-left transition-all duration-200",
          anchor ? "bg-white shadow-soft ring-1 ring-brand-300" : "hover:bg-white hover:shadow-soft hover:ring-1 hover:ring-slate-200",
          busy && "opacity-60",
        )}
      >
        <span className="min-w-0 flex-1">{display}</span>
        <ChevronDown className="size-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/as:opacity-100" />
      </button>
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={240}>
        <p className="px-3.5 pt-3 pb-2 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Attribuer à</p>
        <ul className="scroll-thin max-h-64 overflow-y-auto px-1.5 pb-1.5">
          {active.map((p) => (
            <li key={p.username}>
              <button
                type="button"
                onClick={() => choose(p.username)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-100"
              >
                <Avatar1 name={p.fullName || p.username} size="sm" className="size-6 text-[9px]" />
                <span className="min-w-0 flex-1 truncate">{p.fullName || p.username}</span>
                {p.username === row.assignedTo && <Check className="size-4 text-brand-600" />}
              </button>
            </li>
          ))}
          {active.length === 0 && <li className="px-2 py-2 text-xs text-slate-500">Aucun pilote actif.</li>}
          {row.assignedTo && (
            <li className="mt-1 border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => choose(null)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
              >
                <UserMinus className="size-4" /> Retirer le pilote
              </button>
            </li>
          )}
        </ul>
      </Popover>
    </>
  );
}
