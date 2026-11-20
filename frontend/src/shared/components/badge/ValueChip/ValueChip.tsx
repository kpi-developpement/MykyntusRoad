import { toneFor } from "../../../utils/valueTone";
import { cn } from "../../../utils/cn";

interface ValueChipProps {
  value: string;
  size?: "xs" | "sm";
  className?: string;
  children?: React.ReactNode;
}

/** Coloured "holo" chip for a dropdown value (same colour everywhere for the same value). */
export function ValueChip({ value, size = "sm", className, children }: ValueChipProps) {
  const tone = toneFor(value);
  return (
    <span
      title={value}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ring-1 ring-inset",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.85),0_1px_2px_rgb(15_23_42/0.06)]",
        size === "xs" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-xs",
        tone.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot, tone.glow)} />
      <span className="truncate">{value}</span>
      {children}
    </span>
  );
}
