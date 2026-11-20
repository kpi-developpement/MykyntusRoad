import type { ButtonHTMLAttributes, Ref } from "react";
import { Tooltip } from "../../tooltip/Tooltip/Tooltip";
import { cn } from "../../../utils/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "secondary" | "subtle" | "dark";
  size?: "sm" | "md";
  active?: boolean;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  hideTooltip?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANTS = {
  ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  secondary: "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 shadow-soft hover:bg-slate-50 hover:text-slate-900",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  dark: "text-brand-100 hover:bg-white/10 hover:text-white",
};

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  active,
  tooltipSide = "bottom",
  hideTooltip,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip label={label} side={tooltipSide} disabled={hideTooltip}>
      <button
        type={type}
        aria-label={label}
        {...rest}
        className={cn(
          "inline-grid shrink-0 place-items-center rounded-xl transition-all duration-200 active:scale-95",
          "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
          size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-[18px]",
          active ? "bg-brand-600 text-white shadow-glow hover:bg-brand-700" : VARIANTS[variant],
          className,
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
