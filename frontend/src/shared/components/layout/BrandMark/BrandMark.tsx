import { cn } from "../../../utils/cn";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  /** light = white mark (on blue), dark = blue mark (on white). */
  variant?: "light" | "dark";
  className?: string;
}

const SIZES = { sm: "size-8 rounded-xl text-[11px]", md: "size-10 rounded-2xl text-sm", lg: "size-14 rounded-2xl text-lg" };

export function BrandMark({ size = "md", variant = "dark", className }: BrandMarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden font-display font-bold tracking-tight",
        variant === "light"
          ? "bg-linear-to-br from-white to-brand-100 text-brand-800 shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(255_255_255/0.35),0_10px_28px_-8px_rgb(56_189_248/0.55)]"
          : "bg-linear-to-br from-brand-500 via-brand-600 to-brand-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_26px_-8px_rgb(37_72_234/0.65)]",
        SIZES[size],
        className,
      )}
    >
      <span className="absolute -top-1/2 -left-1/2 size-full rotate-12 bg-linear-to-br from-white/50 to-transparent opacity-60" />
      <span className="absolute inset-x-1 bottom-1 h-px bg-linear-to-r from-transparent via-sky-400 to-transparent" />
      <span className="relative">MK</span>
    </span>
  );
}
