import { Ban, CheckCircle2, Clock3, Hourglass, TriangleAlert } from "lucide-react";
import { DELAY_LABELS, type Delay } from "../../../types";
import { cn } from "../../../utils/cn";
import { DELAY_TONE } from "../../../utils/delayTone";

const ICON = { LATE: TriangleAlert, SOON: Hourglass, DONE: CheckCircle2, ON_TIME: Clock3, CANCELLED: Ban };

/** "En retard" (red), "Bientôt en retard" (orange), "Clôturé" (green) or "Dans les délais". */
export function DelayBadge({ delay, className }: { delay: Delay; className?: string }) {
  const tone = DELAY_TONE[delay];
  const Icon = ICON[delay];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1",
        tone ? tone.chip : "bg-slate-50 text-slate-500 ring-slate-200",
        className,
      )}
    >
      <Icon className="size-3" />
      {DELAY_LABELS[delay]}
    </span>
  );
}
