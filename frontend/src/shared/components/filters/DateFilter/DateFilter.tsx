"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { SegmentedControl } from "../../segmented/SegmentedControl/SegmentedControl";
import { cn } from "../../../utils/cn";
import { formatDate, today, tomorrow } from "../../../utils/date";

type Mode = "today" | "tomorrow" | "all";

interface DateFilterProps {
  /** yyyy-MM-dd, "" = every date. */
  value: string;
  onChange: (value: string) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = today();
  const tm = tomorrow();
  const mode: Mode | null = value === t ? "today" : value === tm ? "tomorrow" : value === "" ? "all" : null;

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<Mode>
        ariaLabel="Date des dossiers"
        value={mode}
        onChange={(m) => onChange(m === "today" ? t : m === "tomorrow" ? tm : "")}
        options={[
          { value: "today", label: "Aujourd'hui" },
          { value: "tomorrow", label: "Demain" },
          { value: "all", label: "Toutes" },
        ]}
      />
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className={cn(
            "flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold ring-1 transition-all ring-inset",
            mode === null
              ? "bg-brand-600 text-white shadow-glow ring-brand-600"
              : "bg-white text-slate-600 shadow-soft ring-slate-200 hover:text-slate-900 hover:ring-slate-300",
          )}
        >
          <CalendarDays className="size-4" />
          {mode === null ? formatDate(value) : "Autre date"}
        </button>
        <input
          ref={inputRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
    </div>
  );
}
