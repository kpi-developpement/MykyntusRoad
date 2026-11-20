import { useId, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "../../../utils/cn";

interface Input1Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input1({ label, hint, error, leftIcon, rightSlot, className, inputClassName, id, ...rest }: Input1Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}
      <div className="group/input relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 text-slate-400 transition-colors group-focus-within/input:text-brand-600 [&_svg]:size-4">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          {...rest}
          className={cn(
            "h-10 w-full rounded-xl bg-white text-sm text-slate-900 shadow-soft ring-1 transition-[box-shadow] duration-300 ring-inset placeholder:text-slate-400",
            "focus:shadow-[0_0_0_4px_rgb(37_72_234/0.12)] focus:ring-2 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500",
            error ? "ring-rose-300 focus:ring-rose-400" : "ring-slate-200 hover:ring-slate-300 focus:ring-brand-500",
            leftIcon ? "pl-9" : "pl-3",
            rightSlot ? "pr-10" : "pr-3",
            inputClassName,
          )}
        />
        {rightSlot && <span className="absolute right-2 flex items-center">{rightSlot}</span>}
      </div>
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}
