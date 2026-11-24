import { api } from "./api";
import type { BatchSummary, DayStat, PilotWork, RollbackPreview } from "../types";

/** Global view: state of the dates, imported files (cancel), new work of a pilot. */
export const dashboardService = {
  days: (from: string, to: string) => api.get<DayStat[]>("/api/dashboard/days", { from, to }),
  batches: (limit = 200) => api.get<BatchSummary[]>("/api/batches", { limit }),
  rollbackPreview: (id: number) => api.get<RollbackPreview>(`/api/batches/${id}/rollback`),
  rollback: (id: number) => api.post<RollbackPreview>(`/api/batches/${id}/rollback`, {}),
  work: (since: string) => api.get<PilotWork>("/api/me/work", { since }),
};
