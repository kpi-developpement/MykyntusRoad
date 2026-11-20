import { Check } from "lucide-react";
import type { TimelineStage } from "../../../types";
import { cn } from "../../../utils/cn";

/**
 * Horizontal road map: Import → Sécurisation → J-1 → J → J+1.
 * Done steps are filled, the current one glows.
 */
export function StageTrack({ stages }: { stages: TimelineStage[] }) {
  return (
    <ol className="flex items-start">
      {stages.map((stage, i) => {
        const done = stage.status !== "PENDING";
        const current = stage.status === "CURRENT";
        const nextDone = i < stages.length - 1 && stages[i + 1].status !== "PENDING";
        return (
          <li key={stage.key} className="relative flex flex-1 flex-col items-center text-center">
            {i < stages.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[13px] left-1/2 h-0.5 w-full",
                  nextDone ? "bg-linear-to-r from-brand-500 to-sky-400" : "bg-slate-200",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 place-items-center rounded-full text-[10px] font-bold ring-4 ring-white transition-colors",
                current
                  ? "bg-linear-to-br from-sky-400 to-brand-600 text-white shadow-[0_0_0_4px_rgb(56_189_248/0.25),0_0_16px_rgb(56_189_248/0.6)]"
                  : done
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {done && !current ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              {current && <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/40" />}
            </span>
            <span className={cn("mt-1.5 font-mono text-[9.5px] tracking-[0.08em] uppercase", current ? "font-semibold text-brand-700" : done ? "text-slate-700" : "text-slate-400")}>
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
