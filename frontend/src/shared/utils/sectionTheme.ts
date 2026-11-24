import type { DataSource, FieldSection } from "../types";

/** Header groups: application sections + imported data ("RAW" = main file, SEC_n = sécurisation files). */
export type GroupId = FieldSection | "RAW" | Exclude<DataSource, "MAIN">;

export interface GroupTheme {
  header: string;
  sub: string;
  bar: string;
  soft: string;
  ring: string;
  /** Solid marker (stage dot, legend). */
  solid: string;
  /** Strong text colour. */
  text: string;
  /** Small chip: soft background + ring + text. */
  chip: string;
}

/**
 * One colour per service, the same everywhere (table headers, road map, history):
 * Sécurisation blue, Planification violet, J green, J+1 fuchsia. Orange and red are kept for the delays.
 */
const SECURISATION: GroupTheme = {
  header: "bg-linear-to-r from-blue-700 to-blue-500 text-white",
  sub: "bg-blue-50 text-blue-950",
  bar: "bg-blue-600",
  soft: "bg-blue-50 text-blue-700",
  ring: "ring-blue-200",
  solid: "bg-blue-600",
  text: "text-blue-700",
  chip: "bg-blue-50 text-blue-700 ring-blue-200",
};

export const SECTION_THEME: Record<GroupId, GroupTheme> = {
  SECURISATION,
  // history written before J-1 was merged into Sécurisation
  J_MINUS_1: SECURISATION,
  PLANIFICATION: {
    header: "bg-linear-to-r from-violet-700 to-violet-500 text-white",
    sub: "bg-violet-50 text-violet-950",
    bar: "bg-violet-600",
    soft: "bg-violet-50 text-violet-700",
    ring: "ring-violet-200",
    solid: "bg-violet-600",
    text: "text-violet-700",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  J: {
    header: "bg-linear-to-r from-emerald-700 to-emerald-500 text-white",
    sub: "bg-emerald-50 text-emerald-950",
    bar: "bg-emerald-600",
    soft: "bg-emerald-50 text-emerald-700",
    ring: "ring-emerald-200",
    solid: "bg-emerald-600",
    text: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  J_PLUS_1: {
    header: "bg-linear-to-r from-fuchsia-700 to-fuchsia-500 text-white",
    sub: "bg-fuchsia-50 text-fuchsia-950",
    bar: "bg-fuchsia-600",
    soft: "bg-fuchsia-50 text-fuchsia-700",
    ring: "ring-fuchsia-200",
    solid: "bg-fuchsia-600",
    text: "text-fuchsia-700",
    chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  },
  RAW: {
    header: "bg-linear-to-r from-slate-700 to-slate-600 text-white",
    sub: "bg-slate-50 text-slate-700",
    bar: "bg-slate-500",
    soft: "bg-slate-100 text-slate-700",
    ring: "ring-slate-200",
    solid: "bg-slate-500",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  SEC_GLOBAL: {
    header: "bg-linear-to-r from-night to-blue-800 text-white",
    sub: "bg-blue-50/70 text-blue-950",
    bar: "bg-blue-800",
    soft: "bg-blue-50 text-blue-800",
    ring: "ring-blue-200",
    solid: "bg-blue-800",
    text: "text-blue-800",
    chip: "bg-blue-50 text-blue-800 ring-blue-200",
  },
  SEC_1: {
    header: "bg-linear-to-r from-slate-800 to-slate-600 text-white",
    sub: "bg-slate-50 text-slate-800",
    bar: "bg-slate-600",
    soft: "bg-slate-100 text-slate-700",
    ring: "ring-slate-200",
    solid: "bg-slate-600",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  SEC_2: {
    header: "bg-linear-to-r from-slate-800 to-slate-600 text-white",
    sub: "bg-slate-50 text-slate-800",
    bar: "bg-slate-600",
    soft: "bg-slate-100 text-slate-700",
    ring: "ring-slate-200",
    solid: "bg-slate-600",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  SEC_3: {
    header: "bg-linear-to-r from-slate-800 to-slate-600 text-white",
    sub: "bg-slate-50 text-slate-800",
    bar: "bg-slate-600",
    soft: "bg-slate-100 text-slate-700",
    ring: "ring-slate-200",
    solid: "bg-slate-600",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

/** Colours of a road map stage ("IMPORT" or a section). */
export function stageTheme(key: string): GroupTheme {
  return key in SECTION_THEME ? SECTION_THEME[key as GroupId] : SECTION_THEME.RAW;
}

/** Group of an imported column. */
export function sourceGroup(source: DataSource): GroupId {
  return source === "MAIN" ? "RAW" : source;
}
