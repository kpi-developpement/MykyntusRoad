"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, CircleAlert, Eraser, LoaderCircle, Plus, Search } from "lucide-react";
import { useFocusOnMount } from "../../../hooks/useFocusOnMount";
import type { AppField } from "../../../types";
import { cn } from "../../../utils/cn";
import { formatDate, today } from "../../../utils/date";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { Button1 } from "../../button/Button1/Button1";
import { Popover } from "../../popover/Popover/Popover";

type SaveState = "idle" | "saving" | "saved" | "error";

interface ValuePickerProps {
  field: AppField;
  value: string | undefined;
  editable: boolean;
  onSave: (value: string | null) => Promise<void>;
}

/** How a value is displayed in a cell, according to the column type. */
function CellValue({ field, value }: { field: AppField; value: string }) {
  switch (field.type) {
    case "SELECT":
      return <ValueChip value={value} />;
    case "DATE":
      return (
        <span className="inline-flex h-6 items-center gap-1.5 rounded-lg bg-white px-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
          <CalendarDays className="size-3 text-brand-500" />
          {formatDate(value)}
        </span>
      );
    case "USER":
      return (
        <span className="inline-flex max-w-full items-center gap-1.5 text-[13px] font-medium text-slate-700" title={value}>
          <Avatar1 name={value} size="sm" className="size-5 text-[8px] ring-1" />
          <span className="truncate">{value}</span>
        </span>
      );
    default:
      return (
        <span className="block truncate px-0.5 text-sm text-slate-700" title={value}>
          {value}
        </span>
      );
  }
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/**
 * Cell editor of the dossier table: coloured chip + popover with the values
 * defined by the admin (or a text box for free text columns).
 * Shows saving / saved / error feedback in place.
 */
export function ValuePicker({ field, value, editable, onSave }: ValuePickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const display = pending !== undefined ? pending : (value ?? null);

  async function choose(next: string | null) {
    setAnchor(null);
    if ((value ?? null) === next) return;
    setPending(next);
    setState("saving");
    try {
      await onSave(next);
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1400);
    } catch {
      setState("error");
      setTimeout(() => setState((s) => (s === "error" ? "idle" : s)), 1800);
    } finally {
      setPending(undefined);
    }
  }

  // USER columns are filled automatically (who treated the dossier)
  if (!editable || field.type === "USER") {
    if (!display) return <span className="px-1.5 text-slate-300">—</span>;
    return (
      <span className="block px-1">
        <CellValue field={field} value={display} />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        disabled={state === "saving"}
        aria-haspopup="listbox"
        aria-expanded={!!anchor}
        aria-label={`${field.label} : ${display ?? "vide"}`}
        className={cn(
          "group/cell flex h-8 w-full items-center gap-1 rounded-lg px-1 text-left transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none",
          anchor ? "bg-white shadow-soft ring-1 ring-brand-300" : "hover:bg-white hover:shadow-soft hover:ring-1 hover:ring-slate-200",
          state === "error" && "animate-shake ring-1 ring-rose-300",
        )}
      >
        <span className="min-w-0 flex-1">
          {display ? (
            <CellValue field={field} value={display} />
          ) : (
            <>
              <span className="px-1 text-slate-300 group-hover/row:hidden">—</span>
              <span className="hidden h-6 items-center gap-1 rounded-full border border-dashed border-brand-300 bg-brand-50/60 px-2 text-xs font-medium text-brand-600 group-hover/row:inline-flex">
                <Plus className="size-3" />
                {field.type === "SELECT" ? "Choisir" : "Saisir"}
              </span>
            </>
          )}
        </span>
        <span className="grid size-4 shrink-0 place-items-center">
          {state === "saving" && <LoaderCircle className="size-3.5 animate-spin text-brand-500" />}
          {state === "saved" && (
            <span className="grid size-4 animate-pop place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="size-2.5" strokeWidth={4} />
            </span>
          )}
          {state === "error" && <CircleAlert className="size-3.5 text-rose-500" />}
          {state === "idle" && <ChevronDown className="size-3.5 text-slate-300 opacity-0 transition group-hover/cell:opacity-100" />}
        </span>
      </button>

      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={field.type === "TEXT" ? 300 : 248}>
        {field.type === "TEXT" ? (
          <TextEditor field={field} value={value ?? ""} onSave={(v) => choose(v)} onCancel={() => setAnchor(null)} />
        ) : field.type === "DATE" ? (
          <DateEditor field={field} value={value ?? ""} onSave={(v) => choose(v)} />
        ) : (
          <OptionList field={field} value={value ?? null} onChoose={choose} />
        )}
      </Popover>
    </>
  );
}

function OptionList({ field, value, onChoose }: { field: AppField; value: string | null; onChoose: (value: string | null) => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(() => Math.max(0, field.options.findIndex((o) => o.value === value)));
  const showSearch = field.options.length > 6;
  const wrapRef = useFocusOnMount<HTMLDivElement>(!showSearch);
  const searchRef = useFocusOnMount<HTMLInputElement>(showSearch);
  const options = field.options.map((o) => o.value).filter((v) => normalize(v).includes(normalize(q)));
  const safeActive = Math.min(active, Math.max(options.length - 1, 0));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(safeActive + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(safeActive - 1, 0));
    } else if (e.key === "Enter" && options[safeActive]) {
      e.preventDefault();
      onChoose(options[safeActive]);
    }
  }

  return (
    <div ref={wrapRef} tabIndex={-1} onKeyDown={onKeyDown} className="outline-none">
      <p className="truncate px-3.5 pt-3 pb-2 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">{field.label}</p>
      {showSearch && (
        <div className="relative mx-2.5 mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Filtrer les valeurs…"
            className="h-8 w-full rounded-lg bg-slate-50 pr-2 pl-7 text-sm ring-1 ring-slate-200 ring-inset placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      )}
      <ul role="listbox" aria-label={field.label} className="scroll-thin max-h-64 overflow-y-auto px-1.5 pb-1.5">
        {options.map((o, i) => (
          <li key={o}>
            <button
              type="button"
              role="option"
              aria-selected={o === value}
              onMouseMove={() => i !== safeActive && setActive(i)}
              onClick={() => onChoose(o)}
              className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors", i === safeActive && "bg-slate-100")}
            >
              <ValueChip value={o} />
              {o === value && <Check className="ml-auto size-4 shrink-0 text-brand-600" />}
            </button>
          </li>
        ))}
        {options.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-slate-400">
            {field.options.length ? "Aucune valeur trouvée" : "Aucune valeur définie par l'administrateur"}
          </li>
        )}
      </ul>
      {value && (
        <div className="border-t border-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => onChoose(null)}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <Eraser className="size-3.5" />
            Effacer la valeur
          </button>
        </div>
      )}
    </div>
  );
}

function TextEditor({ field, value, onSave, onCancel }: { field: AppField; value: string; onSave: (v: string | null) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value);
  const textRef = useFocusOnMount<HTMLTextAreaElement>();
  const save = () => onSave(draft.trim() || null);
  return (
    <div className="p-3.5">
      <p className="mb-2 truncate font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">{field.label}</p>
      <textarea
        ref={textRef}
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
        }}
        className="scroll-thin w-full resize-none rounded-xl bg-slate-50 p-2.5 text-sm ring-1 ring-slate-200 ring-inset focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
        placeholder="Saisir un texte…"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">Ctrl + Entrée</span>
        <div className="flex gap-1.5">
          <Button1 size="xs" variant="ghost" onClick={onCancel}>
            Annuler
          </Button1>
          <Button1 size="xs" onClick={save}>
            Enregistrer
          </Button1>
        </div>
      </div>
    </div>
  );
}

function DateEditor({ field, value, onSave }: { field: AppField; value: string; onSave: (v: string | null) => void }) {
  const [draft, setDraft] = useState(value || today());
  const inputRef = useFocusOnMount<HTMLInputElement>();
  return (
    <div className="p-3.5">
      <p className="mb-2 truncate font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">{field.label}</p>
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && draft && onSave(draft)}
        className="h-10 w-full rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-slate-200 ring-inset focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
      />
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Button1 size="xs" variant="ghost" onClick={() => onSave(today())}>
          Aujourd&apos;hui
        </Button1>
        <div className="flex gap-1.5">
          {value && (
            <Button1 size="xs" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => onSave(null)}>
              Effacer
            </Button1>
          )}
          <Button1 size="xs" disabled={!draft} onClick={() => onSave(draft)}>
            Enregistrer
          </Button1>
        </div>
      </div>
    </div>
  );
}
