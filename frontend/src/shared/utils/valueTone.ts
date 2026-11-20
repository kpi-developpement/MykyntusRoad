/**
 * Colour of a value chip. Known words get a meaning (Oui = green, Non = red...),
 * other values get a stable colour computed from their text.
 */
export interface Tone {
  chip: string;
  dot: string;
  glow: string;
}

const TONES = {
  emerald: {
    chip: "bg-linear-to-b from-emerald-50 to-emerald-100/70 text-emerald-700 ring-emerald-200/90",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_6px_rgb(16_185_129/0.75)]",
  },
  rose: {
    chip: "bg-linear-to-b from-rose-50 to-rose-100/70 text-rose-700 ring-rose-200/90",
    dot: "bg-rose-500",
    glow: "shadow-[0_0_6px_rgb(244_63_94/0.7)]",
  },
  amber: {
    chip: "bg-linear-to-b from-amber-50 to-amber-100/70 text-amber-800 ring-amber-200/90",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_6px_rgb(245_158_11/0.7)]",
  },
  slate: {
    chip: "bg-linear-to-b from-slate-50 to-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    glow: "",
  },
  brand: {
    chip: "bg-linear-to-b from-brand-50 to-brand-100/70 text-brand-700 ring-brand-200/90",
    dot: "bg-brand-500",
    glow: "shadow-[0_0_6px_rgb(59_102_245/0.7)]",
  },
  sky: {
    chip: "bg-linear-to-b from-sky-50 to-sky-100/70 text-sky-700 ring-sky-200/90",
    dot: "bg-sky-500",
    glow: "shadow-[0_0_6px_rgb(14_165_233/0.75)]",
  },
  violet: {
    chip: "bg-linear-to-b from-violet-50 to-violet-100/70 text-violet-700 ring-violet-200/90",
    dot: "bg-violet-500",
    glow: "shadow-[0_0_6px_rgb(139_92_246/0.7)]",
  },
  indigo: {
    chip: "bg-linear-to-b from-indigo-50 to-indigo-100/70 text-indigo-700 ring-indigo-200/90",
    dot: "bg-indigo-500",
    glow: "shadow-[0_0_6px_rgb(99_102_241/0.7)]",
  },
  teal: {
    chip: "bg-linear-to-b from-teal-50 to-teal-100/70 text-teal-700 ring-teal-200/90",
    dot: "bg-teal-500",
    glow: "shadow-[0_0_6px_rgb(20_184_166/0.7)]",
  },
  cyan: {
    chip: "bg-linear-to-b from-cyan-50 to-cyan-100/70 text-cyan-700 ring-cyan-200/90",
    dot: "bg-cyan-500",
    glow: "shadow-[0_0_6px_rgb(6_182_212/0.75)]",
  },
  fuchsia: {
    chip: "bg-linear-to-b from-fuchsia-50 to-fuchsia-100/70 text-fuchsia-700 ring-fuchsia-200/90",
    dot: "bg-fuchsia-500",
    glow: "shadow-[0_0_6px_rgb(217_70_239/0.7)]",
  },
  orange: {
    chip: "bg-linear-to-b from-orange-50 to-orange-100/70 text-orange-700 ring-orange-200/90",
    dot: "bg-orange-500",
    glow: "shadow-[0_0_6px_rgb(249_115_22/0.7)]",
  },
} satisfies Record<string, Tone>;

type ToneName = keyof typeof TONES;

const SEMANTIC: Array<[RegExp, ToneName]> = [
  [/^(oui|ok|yes|vrai)$/i, "emerald"],
  [/(planifi|s[ée]curis|valid|termin|cl[ôo]tur|r[ée]solu|confirm|fait|livr)/i, "emerald"],
  [/^(non|no|ko|faux)$/i, "rose"],
  [/(injoignable|[ée]chec|annul|refus|retard|bloqu|absent|erreur)/i, "rose"],
  [/^(na|n\/a|aucun|vide|-)$/i, "slate"],
  [/(ouvert|en cours|attente|report|partiel|relance)/i, "amber"],
];

const FALLBACK: ToneName[] = ["sky", "violet", "indigo", "teal", "cyan", "fuchsia", "orange", "brand"];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function toneFor(value: string): Tone {
  const v = value.trim();
  for (const [pattern, tone] of SEMANTIC) {
    if (pattern.test(v)) return TONES[tone];
  }
  return TONES[FALLBACK[hash(v.toLowerCase()) % FALLBACK.length]];
}

/** Avatar gradient from a name. */
const AVATARS = [
  "from-brand-500 to-brand-700",
  "from-sky-500 to-brand-600",
  "from-indigo-500 to-violet-600",
  "from-cyan-500 to-sky-600",
  "from-violet-500 to-fuchsia-600",
  "from-teal-500 to-cyan-600",
];

export function avatarGradient(name: string): string {
  return AVATARS[hash(name) % AVATARS.length];
}
