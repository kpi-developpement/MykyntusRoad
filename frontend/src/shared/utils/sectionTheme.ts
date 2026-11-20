import type { DataSource, FieldSection } from "../types";

/** Header groups: application sections + imported data ("RAW" = main file, SEC_n = sécurisation files). */
export type GroupId = FieldSection | "RAW" | Exclude<DataSource, "MAIN">;

interface GroupTheme {
  header: string;
  sub: string;
  bar: string;
  soft: string;
  ring: string;
}

/** Colours of each group of columns (all in the blue family). */
export const SECTION_THEME: Record<GroupId, GroupTheme> = {
  SECURISATION: {
    header: "bg-linear-to-r from-cyan-700 to-cyan-500 text-white",
    sub: "bg-cyan-50 text-cyan-950",
    bar: "bg-cyan-600",
    soft: "bg-cyan-50 text-cyan-700",
    ring: "ring-cyan-200",
  },
  J_MINUS_1: {
    header: "bg-linear-to-r from-brand-700 to-brand-600 text-white",
    sub: "bg-brand-50 text-brand-900",
    bar: "bg-brand-600",
    soft: "bg-brand-50 text-brand-700",
    ring: "ring-brand-200",
  },
  J: {
    header: "bg-linear-to-r from-sky-600 to-sky-500 text-white",
    sub: "bg-sky-50 text-sky-950",
    bar: "bg-sky-500",
    soft: "bg-sky-50 text-sky-700",
    ring: "ring-sky-200",
  },
  J_PLUS_1: {
    header: "bg-linear-to-r from-indigo-800 to-indigo-600 text-white",
    sub: "bg-indigo-50 text-indigo-950",
    bar: "bg-indigo-600",
    soft: "bg-indigo-50 text-indigo-700",
    ring: "ring-indigo-200",
  },
  RAW: {
    header: "bg-linear-to-r from-slate-700 to-slate-600 text-white",
    sub: "bg-slate-50 text-slate-700",
    bar: "bg-slate-500",
    soft: "bg-slate-100 text-slate-700",
    ring: "ring-slate-200",
  },
  SEC_GLOBAL: {
    header: "bg-linear-to-r from-night to-brand-800 text-white",
    sub: "bg-brand-50/70 text-brand-950",
    bar: "bg-brand-800",
    soft: "bg-brand-50 text-brand-800",
    ring: "ring-brand-200",
  },
  SEC_1: {
    header: "bg-linear-to-r from-slate-800 to-teal-700 text-white",
    sub: "bg-teal-50/70 text-teal-950",
    bar: "bg-teal-600",
    soft: "bg-teal-50 text-teal-700",
    ring: "ring-teal-200",
  },
  SEC_2: {
    header: "bg-linear-to-r from-slate-800 to-cyan-800 text-white",
    sub: "bg-cyan-50/70 text-cyan-950",
    bar: "bg-cyan-700",
    soft: "bg-cyan-50 text-cyan-800",
    ring: "ring-cyan-200",
  },
  SEC_3: {
    header: "bg-linear-to-r from-slate-800 to-sky-800 text-white",
    sub: "bg-sky-50/70 text-sky-950",
    bar: "bg-sky-700",
    soft: "bg-sky-50 text-sky-800",
    ring: "ring-sky-200",
  },
};

/** Group of an imported column. */
export function sourceGroup(source: DataSource): GroupId {
  return source === "MAIN" ? "RAW" : source;
}
