"use client";

import { useState } from "react";
import { Check, Hand, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { addFlag, useFlags } from "../../../hooks/useFlags";
import { flagService } from "../../../services/flagService";
import { CUSTOM_FLAG_COLORS, type FlagColor } from "../../../types";
import { cn } from "../../../utils/cn";
import { flagTone } from "../../../utils/flagColors";
import { Button1 } from "../../button/Button1/Button1";
import { FlagBadge } from "../FlagBadge/FlagBadge";

interface FlagMenuProps {
  /** Current flags of the dossier. */
  value: string[];
  manual: boolean;
  onApply: (codes: string[]) => Promise<void>;
  onReset: () => Promise<void>;
  onClose: () => void;
}

/**
 * Flags of one dossier: toggle any flag (the list becomes manual), create a custom flag,
 * or go back to the automatic detection.
 */
export function FlagMenu({ value, manual, onApply, onReset, onClose }: FlagMenuProps) {
  const { flags } = useFlags();
  const [selected, setSelected] = useState<string[]>(value);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const changed = selected.length !== value.length || selected.some((c) => !value.includes(c));

  function toggle(code: string) {
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      onClose();
    } catch {
      /* the caller shows the error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2">
        <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Drapeaux</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
            manual ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200",
          )}
        >
          {manual ? <Hand className="size-3" /> : <Sparkles className="size-3" />}
          {manual ? "Manuel" : "Automatique"}
        </span>
      </div>

      <ul className="scroll-thin grid max-h-64 grid-cols-1 gap-0.5 overflow-y-auto px-1.5">
        {flags.map((f) => {
          const on = selected.includes(f.code);
          return (
            <li key={f.code}>
              <button
                type="button"
                onClick={() => toggle(f.code)}
                aria-pressed={on}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors",
                  on ? "bg-brand-50/70" : "hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-[5px] ring-1 transition-all duration-200",
                    on ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 group-hover:ring-brand-400",
                  )}
                >
                  {on && <Check className="size-3 animate-pop" strokeWidth={3.5} />}
                </span>
                <FlagBadge code={f.code} flag={f} />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{f.label}</span>
                {!f.builtin && <span className="font-mono text-[9px] text-slate-400 uppercase">perso</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {creating ? (
        <CreateFlagForm
          onCancel={() => setCreating(false)}
          onCreated={(code) => {
            setCreating(false);
            setSelected((s) => (s.includes(code) ? s : [...s, code]));
          }}
        />
      ) : (
        <div className="px-2 pt-1.5">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-8 w-full items-center gap-2 rounded-xl border border-dashed border-brand-200 px-2.5 text-xs font-medium text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50/60"
          >
            <Plus className="size-3.5" /> Nouveau drapeau
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 px-2.5 py-2.5">
        <Button1
          variant="ghost"
          size="xs"
          leftIcon={<RotateCcw />}
          disabled={busy || !manual}
          onClick={() => run(onReset)}
          title="Revenir aux drapeaux détectés à partir des colonnes du dossier"
        >
          Automatique
        </Button1>
        <Button1 size="xs" className="ml-auto" disabled={busy || !changed} loading={busy} onClick={() => run(() => onApply(selected))}>
          Appliquer
        </Button1>
      </div>
    </div>
  );
}

/** Code + meaning + one of the 5 custom colours. Reusable and filterable everywhere right away. */
export function CreateFlagForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<FlagColor>("VIOLET_VIF");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleanCode || !label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const flag = await flagService.create({ code: cleanCode, label: label.trim(), color });
      addFlag(flag);
      onCreated(flag.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-2 mt-1.5 animate-scale-in rounded-2xl bg-slate-50/80 p-2.5 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Nouveau drapeau</p>
        <button type="button" onClick={onCancel} aria-label="Annuler" className="text-slate-400 hover:text-slate-700">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.slice(0, 12))}
          placeholder="Code"
          className="h-8 w-20 rounded-lg bg-white px-2 font-mono text-xs uppercase ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 120))}
          placeholder="Signification"
          className="h-8 min-w-0 flex-1 rounded-lg bg-white px-2 text-xs ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {CUSTOM_FLAG_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={c.label}
            aria-pressed={color === c.value}
            onClick={() => setColor(c.value)}
            className={cn(
              "size-6 rounded-full ring-2 ring-offset-2 transition-transform duration-200 hover:scale-110",
              flagTone(c.value).solid,
              color === c.value ? "scale-110 ring-brand-500" : "ring-transparent",
            )}
          />
        ))}
        <span className="ml-auto">{cleanCode && <FlagBadge code={cleanCode} flag={{ id: 0, code: cleanCode, label, color, builtin: false, position: 0 }} />}</span>
      </div>
      {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}
      <Button1 type="submit" size="xs" className="mt-2.5 w-full" loading={saving} disabled={!cleanCode || !label.trim()}>
        Créer le drapeau
      </Button1>
    </form>
  );
}
