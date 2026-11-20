import { cn } from "../../../utils/cn";

interface Switch1Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Switch1({ checked, onChange, label, disabled, size = "md" }: Switch1Props) {
  const small = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex items-center gap-2 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50",
        "rounded-full focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none",
      )}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-300",
          small ? "h-4 w-7" : "h-5 w-9",
          checked ? "bg-brand-600 shadow-[0_0_0_3px_rgb(37_72_234/0.12)]" : "bg-slate-200 group-hover:bg-slate-300",
        )}
      >
        <span
          className={cn(
            "rounded-full bg-white shadow-sm transition-transform duration-300 ease-spring",
            small ? "size-3" : "size-4",
            checked && (small ? "translate-x-3" : "translate-x-4"),
          )}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
