import { cn } from "../../../utils/cn";

type Side = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  label: React.ReactNode;
  side?: Side;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

const SIDES: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 group-hover/tt:translate-y-0",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2 -translate-y-1 group-hover/tt:translate-y-0",
  right: "left-full top-1/2 ml-3 -translate-y-1/2 -translate-x-1 group-hover/tt:translate-x-0",
  left: "right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 group-hover/tt:translate-x-0",
};

/** Lightweight CSS tooltip (hover / keyboard focus). */
export function Tooltip({ label, side = "top", disabled, children, className }: TooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[90] rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition duration-150",
          "group-focus-within/tt:opacity-100 group-hover/tt:opacity-100 group-hover/tt:delay-150",
          SIDES[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}
