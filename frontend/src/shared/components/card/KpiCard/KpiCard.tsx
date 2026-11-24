"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ProgressRing } from "../../chart/ProgressRing/ProgressRing";
import { AnimatedNumber } from "../../motion/AnimatedNumber/AnimatedNumber";
import { Surface } from "../../surface/Surface/Surface";
import { cn } from "../../../utils/cn";

type Tone = "brand" | "sky" | "indigo" | "cyan" | "slate" | "blue" | "violet" | "emerald" | "fuchsia";

interface KpiCardProps {
  label: string;
  value: number;
  /** When set, shows "value / total" and a progress ring. */
  total?: number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  index?: number;
}

const TONES: Record<Tone, { tile: string; from: string; to: string; icon: string; line: string }> = {
  brand: { tile: "from-brand-500 to-brand-800", from: "#608bfa", to: "#1d37d7", icon: "text-brand-600", line: "via-brand-500" },
  sky: { tile: "from-sky-400 to-sky-700", from: "#7dd3fc", to: "#0284c7", icon: "text-sky-600", line: "via-sky-500" },
  indigo: { tile: "from-indigo-400 to-indigo-800", from: "#a5b4fc", to: "#4338ca", icon: "text-indigo-600", line: "via-indigo-500" },
  cyan: { tile: "from-cyan-400 to-cyan-800", from: "#67e8f9", to: "#0e7490", icon: "text-cyan-600", line: "via-cyan-500" },
  slate: { tile: "from-slate-700 to-night", from: "#94a3b8", to: "#0f172a", icon: "text-slate-700", line: "via-slate-500" },
  blue: { tile: "from-blue-400 to-blue-700", from: "#60a5fa", to: "#1d4ed8", icon: "text-blue-600", line: "via-blue-500" },
  violet: { tile: "from-violet-400 to-violet-700", from: "#a78bfa", to: "#6d28d9", icon: "text-violet-600", line: "via-violet-500" },
  emerald: { tile: "from-emerald-400 to-emerald-700", from: "#34d399", to: "#047857", icon: "text-emerald-600", line: "via-emerald-500" },
  fuchsia: { tile: "from-fuchsia-400 to-fuchsia-700", from: "#e879f9", to: "#a21caf", icon: "text-fuchsia-600", line: "via-fuchsia-500" },
};

/** Key figure with HUD corners, cursor spotlight, count-up and progress ring. */
export function KpiCard({ label, value, total, icon: Icon, tone = "brand", hint, index = 0 }: KpiCardProps) {
  const t = TONES[tone];
  const pct = total ? Math.round((value / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.08 + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <Surface spotlight corners interactive className="group h-full rounded-3xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[10px] font-medium tracking-[0.2em] text-slate-500 uppercase">{label}</p>
            <p className="mt-2.5 flex items-baseline gap-1.5 font-display text-[28px] leading-none font-semibold tracking-tight text-slate-950 sm:text-[34px]">
              <AnimatedNumber value={value} />
              {total !== undefined && (
                <span className="font-mono text-xs font-medium tracking-normal text-slate-400">
                  /<AnimatedNumber value={total} />
                </span>
              )}
            </p>
          </div>
          {total !== undefined ? (
            <ProgressRing value={pct} from={t.from} to={t.to} size={54}>
              <Icon className={cn("size-[18px]", t.icon)} />
            </ProgressRing>
          ) : (
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_24px_-10px_rgb(15_23_42/0.6)] transition-transform duration-500 ease-out-expo group-hover:rotate-[-6deg]",
                t.tile,
              )}
            >
              <Icon className="size-5" />
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 font-mono text-[11px] text-slate-500">
          <span className="truncate">{hint}</span>
          {total !== undefined && <span className="font-semibold text-slate-900 tabular-nums">{pct}%</span>}
        </div>
        <span aria-hidden className={cn("absolute inset-x-6 bottom-0 h-px bg-linear-to-r from-transparent to-transparent", t.line)} />
      </Surface>
    </motion.div>
  );
}
