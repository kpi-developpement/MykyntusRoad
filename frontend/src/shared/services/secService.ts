import { api } from "./api";
import { toBody } from "./dossierService";
import type { DispatchResult, DispatchSummary, DossierCriteria, ImportBatch, ImportResult, Pilote, SecSource } from "../types";

export interface PilotePayload {
  username?: string;
  password?: string;
  fullName?: string;
  active?: boolean;
}

/** Sécurisation admin (ADMIN_SECURISATION): files, pilots and dispatch. */
export const secService = {
  /** Slot 0 = global file, 1..3 = sécurisation files. */
  sources: () => api.get<SecSource[]>("/api/sec/sources"),
  history: () => api.get<ImportBatch[]>("/api/sec/imports"),
  upload: (slot: number, file: File, onProgress?: (ratio: number) => void, date?: string) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<ImportResult>(`/api/sec/imports/${slot}`, form, { onProgress, query: { date } });
  },

  // pilots
  pilotes: () => api.get<Pilote[]>("/api/sec/pilotes"),
  createPilote: (p: { username: string; password: string; fullName?: string }) => api.post<Pilote>("/api/sec/pilotes", p),
  updatePilote: (id: number, p: { fullName?: string | null; active: boolean; password?: string }) =>
    api.put<Pilote>(`/api/sec/pilotes/${id}`, p),
  deletePilote: (id: number) => api.delete(`/api/sec/pilotes/${id}`),

  // dispatch
  summary: (criteria: DossierCriteria) => api.post<DispatchSummary>("/api/sec/dispatch/summary", toBody(criteria)),
  dispatch: (criteria: DossierCriteria, pilotes: string[], onlyUnassigned: boolean) =>
    api.post<DispatchResult>("/api/sec/dispatch", { criteria: toBody(criteria), pilotes, onlyUnassigned }),
  assign: (dossierIds: number[], pilote: string | null) => api.post<DispatchResult>("/api/sec/dispatch/assign", { dossierIds, pilote }),
  transfer: (criteria: DossierCriteria, from: string, to: string[], count: number | null, includeTreated = false) =>
    api.post<DispatchResult>("/api/sec/dispatch/transfer", { criteria: toBody(criteria), from, to, count, includeTreated }),
  unassign: (criteria: DossierCriteria, pilote: string | null, includeTreated = false) =>
    api.post<DispatchResult>("/api/sec/dispatch/unassign", { criteria: toBody(criteria), pilote, includeTreated }),
};
