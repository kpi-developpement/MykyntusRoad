"use client";

import { useId } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../utils/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

/** Tabs / toggle group with a sliding active pill (shared layout animation). */
export function SegmentedControl<T extends string>({ options, value, onChange, size = "md", className, ariaLabel }: SegmentedControlProps<T>) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl bg-slate-900/[0.045] p-1 shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)] ring-1 ring-slate-200/80 ring-inset",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-xs",
              active ? "text-brand-700" : "text-slate-500 hover:text-slate-900",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-white shadow-[inset_0_1px_0_#fff,0_1px_2px_rgb(15_23_42/0.08),0_6px_16px_-8px_rgb(37_72_234/0.45)] ring-1 ring-brand-100"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              >
                <span className="absolute inset-x-3 -bottom-px h-px bg-linear-to-r from-transparent via-sky-400 to-transparent" />
              </motion.span>
            )}
            {Icon && <Icon className="relative size-3.5" />}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 font-mono text-[10px] font-bold tabular-nums transition-colors",
                  active ? "bg-brand-100 text-brand-700" : "bg-slate-200/80 text-slate-500",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
