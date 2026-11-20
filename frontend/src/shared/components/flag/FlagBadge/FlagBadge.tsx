import type { Flag } from "../../../types";
import { cn } from "../../../utils/cn";
import { flagTone } from "../../../utils/flagColors";

interface FlagBadgeProps {
  code: string;
  flag?: Flag;
  size?: "xs" | "sm" | "md";
  /** Shows the meaning next to the code. */
  withLabel?: boolean;
  className?: string;
}

/** Coloured flag badge (P1, SECU, R3&+...). The meaning is in the tooltip. */
export function FlagBadge({ code, flag, size = "sm", withLabel, className }: FlagBadgeProps) {
  const tone = flagTone(flag?.color);
  return (
    <span
      title={flag ? `${flag.code} · ${flag.label}` : code}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md font-mono font-bold tracking-tight whitespace-nowrap ring-1 ring-inset",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]",
        size === "xs" && "h-[18px] px-1.5 text-[9.5px]",
        size === "sm" && "h-5 px-1.5 text-[10.5px]",
        size === "md" && "h-6 px-2 text-xs",
        tone.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.solid)} />
      {code}
      {withLabel && flag && flag.label !== flag.code && <span className="font-sans font-medium tracking-normal opacity-75">{flag.label}</span>}
    </span>
  );
}
