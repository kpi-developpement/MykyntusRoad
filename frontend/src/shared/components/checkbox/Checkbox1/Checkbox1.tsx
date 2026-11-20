import { Check, Minus } from "lucide-react";
import { cn } from "../../../utils/cn";

interface Checkbox1Props {
  checked: boolean;
  indeterminate?: boolean;
  className?: string;
}

/** Visual checkbox, placed inside a clickable row that carries the aria attributes. */
export function Checkbox1({ checked, indeterminate, className }: Checkbox1Props) {
  const on = checked || indeterminate;
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[5px] ring-1 transition-all duration-150 ring-inset",
        on ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 group-hover:ring-brand-400",
        className,
      )}
    >
      {indeterminate ? (
        <Minus className="size-3 animate-pop" strokeWidth={3} />
      ) : (
        checked && <Check className="size-3 animate-pop" strokeWidth={3} />
      )}
    </span>
  );
}
