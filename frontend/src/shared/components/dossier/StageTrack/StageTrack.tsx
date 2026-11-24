import { Check } from "lucide-react";
import type { TimelineStage } from "../../../types";
import { cn } from "../../../utils/cn";
import { stageTheme } from "../../../utils/sectionTheme";

interface StageTrackProps {
  stages: TimelineStage[];
  /** Click on a step (opens its columns). */
  onSelect?: (stage: TimelineStage) => void;
}

/**
 * Horizontal road map: Import → Sécurisation → (Planification) → J → J+1, each service in its colour.
 * Done steps are filled, the current one glows, pending ones stay grey.
 */
export function StageTrack({ stages, onSelect }: StageTrackProps) {
  return (
    <ol className="flex items-start">
      {stages.map((stage, i) => {
        const done = stage.status !== "PENDING";
        const current = stage.status === "CURRENT";
        const nextDone = i < stages.length - 1 && stages[i + 1].status !== "PENDING";
        const theme = stageTheme(stage.key);
        const clickable = !!onSelect && stage.key !== "IMPORT";
        return (
          <li key={stage.key} className="relative flex flex-1 flex-col items-center text-center">
            {i < stages.length - 1 && (
              <span aria-hidden className={cn("absolute top-[13px] left-1/2 h-0.5 w-full", nextDone ? stageTheme(stages[i + 1].key).solid : "bg-slate-200")} />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect?.(stage)}
              title={clickable ? `Voir les colonnes ${stage.label}` : undefined}
              className={cn("group/stage relative z-10 flex flex-col items-center rounded-lg outline-none", clickable && "cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-400")}
            >
              <span
                className={cn(
                  "relative grid size-7 place-items-center rounded-full text-[10px] font-bold ring-4 ring-white transition-transform duration-200",
                  done ? cn(theme.solid, "text-white") : "bg-slate-100 text-slate-400",
                  current && "shadow-[0_0_0_4px_rgb(148_163_184/0.25),0_0_14px_rgb(15_23_42/0.25)]",
                  clickable && "group-hover/stage:scale-110",
                )}
              >
                {done && !current ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                {current && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-40", theme.solid)} />}
              </span>
              <span
                className={cn(
                  "mt-1.5 font-mono text-[9.5px] tracking-[0.08em] uppercase",
                  done ? cn(theme.text, current && "font-semibold") : "text-slate-400",
                  clickable && "group-hover/stage:underline",
                )}
              >
                {stage.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
