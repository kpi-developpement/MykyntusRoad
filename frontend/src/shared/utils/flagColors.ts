import type { FlagColor } from "../types";

interface FlagTone {
  /** Badge: background, text and ring. */
  chip: string;
  /** Solid dot / bar. */
  solid: string;
  /** Hex used by charts and glows. */
  hex: string;
}

/** Colours of the flags (11 predefined + 5 custom). Static class names so Tailwind keeps them. */
export const FLAG_TONES: Record<FlagColor, FlagTone> = {
  RED: { chip: "bg-red-50 text-red-700 ring-red-200", solid: "bg-red-500", hex: "#ef4444" },
  ORANGE: { chip: "bg-orange-50 text-orange-700 ring-orange-200", solid: "bg-orange-500", hex: "#f97316" },
  VIOLET: { chip: "bg-violet-50 text-violet-700 ring-violet-200", solid: "bg-violet-500", hex: "#8b5cf6" },
  AMBER: { chip: "bg-amber-50 text-amber-800 ring-amber-200", solid: "bg-amber-500", hex: "#f59e0b" },
  BLUE: { chip: "bg-blue-50 text-blue-700 ring-blue-200", solid: "bg-blue-500", hex: "#3b82f6" },
  TURQUOISE: { chip: "bg-teal-50 text-teal-700 ring-teal-200", solid: "bg-teal-500", hex: "#14b8a6" },
  EMERALD: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", solid: "bg-emerald-500", hex: "#10b981" },
  CYAN: { chip: "bg-cyan-50 text-cyan-700 ring-cyan-200", solid: "bg-cyan-500", hex: "#06b6d4" },
  PINK: { chip: "bg-pink-50 text-pink-700 ring-pink-200", solid: "bg-pink-500", hex: "#ec4899" },
  INDIGO: { chip: "bg-indigo-50 text-indigo-700 ring-indigo-200", solid: "bg-indigo-500", hex: "#6366f1" },
  LIME: { chip: "bg-lime-50 text-lime-800 ring-lime-300", solid: "bg-lime-500", hex: "#84cc16" },
  VIOLET_VIF: { chip: "bg-purple-50 text-purple-700 ring-purple-300", solid: "bg-purple-600", hex: "#9333ea" },
  FUCHSIA: { chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", solid: "bg-fuchsia-500", hex: "#d946ef" },
  BLEU_CIEL: { chip: "bg-sky-50 text-sky-700 ring-sky-200", solid: "bg-sky-400", hex: "#38bdf8" },
  ARDOISE: { chip: "bg-slate-100 text-slate-700 ring-slate-300", solid: "bg-slate-500", hex: "#64748b" },
  PIERRE: { chip: "bg-stone-100 text-stone-700 ring-stone-300", solid: "bg-stone-500", hex: "#78716c" },
};

const FALLBACK: FlagTone = FLAG_TONES.ARDOISE;

export function flagTone(color: string | undefined): FlagTone {
  return (color && FLAG_TONES[color as FlagColor]) || FALLBACK;
}
