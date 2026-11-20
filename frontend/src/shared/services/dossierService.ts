import { api } from "./api";
import type { DossierCriteria, DossierStats, DossierTable, DossierTimeline, FacetResponse, FieldValue } from "../types";

function toBody(c: DossierCriteria) {
  return {
    date: c.date || null,
    search: c.search.trim() || null,
    filters: c.filters,
    sort: c.sort,
    page: c.page,
    size: c.size,
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
};
