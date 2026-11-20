import { cn } from "../../../utils/cn";

export type BadgeTone = "brand" | "emerald" | "amber" | "slate" | "rose" | "sky" | "indigo" | "violet";

interface Badge1Props {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  brand: { chip: "bg-brand-50 text-brand-700 ring-brand-200/80", dot: "bg-brand-500" },
  emerald: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/80", dot: "bg-emerald-500" },
  amber: { chip: "bg-amber-50 text-amber-800 ring-amber-200/80", dot: "bg-amber-500" },
  slate: { chip: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  rose: { chip: "bg-rose-50 text-rose-700 ring-rose-200/80", dot: "bg-rose-500" },
  sky: { chip: "bg-sky-50 text-sky-700 ring-sky-200/80", dot: "bg-sky-500" },
  indigo: { chip: "bg-indigo-50 text-indigo-700 ring-indigo-200/80", dot: "bg-indigo-500" },
  violet: { chip: "bg-violet-50 text-violet-700 ring-violet-200/80", dot: "bg-violet-500" },
};

export function Badge1({ children, tone = "brand", dot, className }: Badge1Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset",
        TONES[tone].chip,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", TONES[tone].dot)} />}
      {children}
    </span>
  );
}
