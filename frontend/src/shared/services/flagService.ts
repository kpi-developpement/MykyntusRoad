import { api } from "./api";
import type { Flag, FlagColor } from "../types";

export const flagService = {
  list: () => api.get<Flag[]>("/api/flags"),
  create: (payload: { code: string; label: string; color: FlagColor }) => api.post<Flag>("/api/flags", payload),
};
