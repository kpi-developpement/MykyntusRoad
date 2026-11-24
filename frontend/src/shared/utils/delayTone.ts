import type { Delay } from "../types";

/**
 * Colours of the delay of a dossier: orange from J+1 00:00 (must be closed before 12:00),
 * red after J+1 12:00, green when closed.
 */
export const DELAY_TONE: Record<Delay, { id: string; chip: string; dot: string } | null> = {
  LATE: {
    id: "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 hover:text-red-800",
    chip: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  SOON: {
    id: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 hover:text-orange-800",
    chip: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
  },
  DONE: {
    id: "",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  ON_TIME: null,
};
