import { AnimatedNumber } from "../../motion/AnimatedNumber/AnimatedNumber";
import { cn } from "../../../utils/cn";

interface StatCardProps {
  label: string;
  value: number;
  tone?: "brand" | "emerald" | "amber" | "slate";
  icon?: React.ReactNode;
}

const TONES = {
  brand: "from-brand-50 to-white text-brand-700 ring-brand-100",
  emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
  amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
  slate: "from-slate-50 to-white text-slate-700 ring-slate-200/70",
};

export function StatCard({ label, value, tone = "brand", icon }: StatCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-linear-to-br px-4 py-3.5 shadow-[inset_0_1px_0_#fff] ring-1 ring-inset", TONES[tone])}>
      <div className="flex items-center justify-between">
        <AnimatedNumber value={value} className="font-display text-2xl font-semibold" />
        {icon && <span className="opacity-60 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-0.5 font-mono text-[10px] font-medium tracking-[0.14em] uppercase opacity-80">{label}</div>
    </div>
  );
}
