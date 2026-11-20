import { avatarGradient } from "../../../utils/valueTone";
import { cn } from "../../../utils/cn";

interface Avatar1Props {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-8 text-[11px]", md: "size-10 text-xs", lg: "size-12 text-sm" };

export function initialsOf(name: string): string {
  const parts = name.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar1({ name, size = "md", className }: Avatar1Props) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-linear-to-br font-bold tracking-wide text-white shadow-sm ring-2 ring-white/80",
        avatarGradient(name),
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
