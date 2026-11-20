import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface Select1Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "size"> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md";
}

export function Select1({ label, options, placeholder, className, id, size = "md", ...rest }: Select1Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          {...rest}
          className={cn(
            "w-full cursor-pointer appearance-none rounded-xl bg-white pr-9 pl-3 text-slate-900 shadow-soft ring-1 ring-slate-200 transition ring-inset",
            "hover:ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            size === "sm" ? "h-8 text-xs" : "h-10 text-sm",
          )}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
