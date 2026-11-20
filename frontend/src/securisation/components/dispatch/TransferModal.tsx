"use client";

import { useState } from "react";
import { ArrowRightLeft, Check } from "lucide-react";
import { Avatar1 } from "@/shared/components/avatar/Avatar1/Avatar1";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Modal1 } from "@/shared/components/modal/Modal1/Modal1";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import type { PiloteLoad } from "@/shared/types";
import { cn } from "@/shared/utils/cn";

interface TransferModalProps {
  from: PiloteLoad | null;
  pilotes: PiloteLoad[];
  onClose: () => void;
  onConfirm: (to: string[], count: number | null, includeTreated: boolean) => Promise<void>;
}

const nameOf = (p: PiloteLoad) => p.fullName || p.username;

/** Moves part (or all) of a pilot's dossiers to other pilots, spread equitably with the same flag mix. */
export function TransferModal({ from, pilotes, onClose, onConfirm }: TransferModalProps) {
  return (
    <Modal1
      open={!!from}
      onClose={onClose}
      size="md"
      icon={<ArrowRightLeft />}
      title={from ? `Transférer les dossiers de ${nameOf(from)}` : "Transférer"}
      description="Absence, surcharge… Les dossiers sont répartis équitablement entre les pilotes choisis, avec le même mélange de drapeaux."
    >
      {from && <TransferForm key={from.username} from={from} pilotes={pilotes} onClose={onClose} onConfirm={onConfirm} />}
    </Modal1>
  );
}

function TransferForm({ from, pilotes, onClose, onConfirm }: Omit<TransferModalProps, "from"> & { from: PiloteLoad }) {
  const others = pilotes.filter((p) => p.active && p.username !== from.username);
  const [to, setTo] = useState<string[]>(others.map((p) => p.username));
  const [includeTreated, setIncludeTreated] = useState(false);
  const available = includeTreated ? from.assigned : from.assigned - from.treated;
  const [count, setCount] = useState(available);
  const safeCount = Math.min(count, available);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onConfirm(to, safeCount >= available ? null : safeCount, includeTreated);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-800">Nombre de dossiers</p>
          <p className="font-display text-2xl font-bold text-brand-700 tabular-nums">
            {safeCount}
            <span className="text-sm font-medium text-slate-400"> / {available}</span>
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={available}
          value={safeCount}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-brand-600"
          aria-label="Nombre de dossiers à transférer"
        />
        <div className="mt-1 flex gap-1.5">
          {[0.25, 0.5, 1].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setCount(Math.round(available * r))}
              className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            >
              {r === 1 ? "Tout" : `${r * 100}%`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">Vers</p>
        {others.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun autre pilote actif.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {others.map((p) => {
              const on = to.includes(p.username);
              return (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => setTo(on ? to.filter((u) => u !== p.username) : [...to, p.username])}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-left ring-1 transition-all duration-200",
                    on ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-slate-200 hover:ring-slate-300",
                  )}
                >
                  <Avatar1 name={nameOf(p)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{nameOf(p)}</span>
                    <span className="font-mono text-[10px] text-slate-500">{p.assigned - p.treated} restant(s)</span>
                  </span>
                  {on && <Check className="size-4 animate-pop text-brand-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Switch1 checked={includeTreated} onChange={setIncludeTreated} label="Inclure aussi les dossiers déjà traités" size="sm" />

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button1 variant="ghost" onClick={onClose}>
          Annuler
        </Button1>
        <Button1 leftIcon={<ArrowRightLeft />} loading={busy} disabled={to.length === 0 || safeCount === 0} onClick={submit}>
          Transférer {safeCount} dossier(s)
        </Button1>
      </div>
    </div>
  );
}
