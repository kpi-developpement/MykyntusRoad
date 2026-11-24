"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { DayCalendar } from "../../calendar/DayCalendar/DayCalendar";
import { Popover } from "../../popover/Popover/Popover";
import { SegmentedControl } from "../../segmented/SegmentedControl/SegmentedControl";
import { cn } from "../../../utils/cn";
import { formatDate, today, tomorrow } from "../../../utils/date";

type Mode = "today" | "tomorrow" | "all";

interface DateFilterProps {
  /** yyyy-MM-dd, "" = every date. */
  value: string;
  onChange: (value: string) => void;
}

/** Today / tomorrow / every date, or any day picked in a calendar coloured by what happened that day. */
export function DateFilter({ value, onChange }: DateFilterProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const t = today();
  const tm = tomorrow();
  const mode: Mode | null = value === t ? "today" : value === tm ? "tomorrow" : value === "" ? "all" : null;

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
      <button
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-expanded={!!anchor}
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
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={340}>
        <div className="p-3.5">
          <DayCalendar
            value={value || undefined}
            onSelect={(date) => {
              onChange(date);
              setAnchor(null);
            }}
          />
        </div>
      </Popover>
    </div>
  );
}
