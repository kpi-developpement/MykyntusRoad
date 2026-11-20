import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "subtle" | "ghost" | "danger" | "dangerSolid";
type Size = "xs" | "sm" | "md" | "lg";

interface Button1Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "sheen text-white bg-linear-to-br from-brand-500 via-brand-600 to-brand-800 shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_8px_22px_-8px_rgb(37_72_234/0.75)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_14px_30px_-10px_rgb(37_72_234/0.85),0_0_0_4px_rgb(59_102_245/0.14)]",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 shadow-soft hover:text-brand-700 hover:ring-brand-200 hover:shadow-[0_10px_24px_-12px_rgb(37_72_234/0.45)]",
  subtle: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-100",
  ghost: "text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900",
  danger: "bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50",
  dangerSolid: "sheen text-white bg-linear-to-br from-rose-500 to-rose-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_20px_-8px_rgb(225_29_72/0.7)]",
};

const SIZES: Record<Size, string> = {
  xs: "h-7 gap-1.5 rounded-lg px-2.5 text-xs [&_svg]:size-3.5",
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs [&_svg]:size-3.5",
  md: "h-10 gap-2 rounded-xl px-4 text-sm [&_svg]:size-4",
  lg: "h-11 gap-2 rounded-xl px-5 text-sm [&_svg]:size-4",
};

/** Classes of a button, reusable on links. */
export function buttonClasses(variant: ButtonVariant = "primary", size: Size = "md", className?: string) {
  return cn(
    "group/btn relative inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none",
    "transition-[transform,box-shadow,background-color,color,opacity] duration-300 ease-out-expo",
    "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button1({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  leftIcon,
  rightIcon,
  className,
  children,
  type = "button",
  ...rest
}: Button1Props) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
