import { api } from "./api";
import type { DossierCriteria, DossierFlags, DossierStats, DossierTable, DossierTimeline, DossierWorkers, FacetResponse, FieldValue, Team } from "../types";

export function toBody(c: DossierCriteria) {
  return {
    date: c.date || null,
    search: c.search.trim() || null,
    filters: c.filters,
    sort: c.sort,
    page: c.page,
    size: c.size,
    pin: c.pin ?? null,
  };
}

export const dossierService = {
  search: (criteria: DossierCriteria) => api.post<DossierTable>("/api/dossiers/search", toBody(criteria)),
  facets: (criteria: DossierCriteria, key: string, q: string) =>
    api.post<FacetResponse>("/api/dossiers/facets", { criteria: toBody(criteria), key, q: q || null, limit: 300 }),
  stats: (criteria: DossierCriteria) => api.post<DossierStats>("/api/dossiers/stats", toBody(criteria)),
  updateValue: (dossierId: number, fieldId: number, value: string | null) =>
    api.put<FieldValue>(`/api/dossiers/${dossierId}/values/${fieldId}`, { value }),
  timeline: (dossierId: number) => api.get<DossierTimeline>(`/api/dossiers/${dossierId}/timeline`),
  setFlags: (dossierId: number, codes: string[]) => api.put<DossierFlags>(`/api/dossiers/${dossierId}/flags`, { codes }),
  resetFlags: (dossierId: number) => api.delete<DossierFlags>(`/api/dossiers/${dossierId}/flags`),
  /** Pilots of a team on the dossier (shown before taking / joining it). */
  workers: (dossierId: number, team: Team) => api.get<DossierWorkers>(`/api/dossiers/${dossierId}/workers/${team}`),
  /** Take the dossier, or join the pilots already on it. */
  join: (dossierId: number, team: Team) => api.post<DossierWorkers>(`/api/dossiers/${dossierId}/workers/${team}`),
  /** Stop working on the dossier. */
  leave: (dossierId: number, team: Team) => api.delete<DossierWorkers>(`/api/dossiers/${dossierId}/workers/${team}`),
  /** Excel export of every matching dossier (columns in the given order). */
  exportExcel: (criteria: DossierCriteria, columns: { key: string; label: string }[]) =>
    api.download("/api/dossiers/export", { criteria: { ...toBody(criteria), page: 0 }, columns }, "dossiers.xlsx"),
};
