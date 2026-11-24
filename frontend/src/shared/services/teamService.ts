import { api } from "./api";
import { toBody } from "./dossierService";
import type { DispatchResult, DispatchSummary, DossierCriteria, Pilote, Team } from "../types";

/** Pilots and dispatch of a team (sécurisation: sécurisation admin; planification and J: admin). */
export const teamService = {
  pilotes: (team: Team) => api.get<Pilote[]>(`/api/teams/${team}/pilotes`),
  summary: (team: Team, criteria: DossierCriteria) => api.post<DispatchSummary>(`/api/teams/${team}/dispatch/summary`, toBody(criteria)),
  dispatch: (team: Team, criteria: DossierCriteria, pilotes: string[], onlyUnassigned: boolean) =>
    api.post<DispatchResult>(`/api/teams/${team}/dispatch`, { criteria: toBody(criteria), pilotes, onlyUnassigned }),
  assign: (team: Team, dossierIds: number[], pilote: string | null) =>
    api.post<DispatchResult>(`/api/teams/${team}/dispatch/assign`, { dossierIds, pilote }),
  transfer: (team: Team, criteria: DossierCriteria, from: string, to: string[], count: number | null, includeTreated = false) =>
    api.post<DispatchResult>(`/api/teams/${team}/dispatch/transfer`, { criteria: toBody(criteria), from, to, count, includeTreated }),
  unassign: (team: Team, criteria: DossierCriteria, pilote: string | null, includeTreated = false) =>
    api.post<DispatchResult>(`/api/teams/${team}/dispatch/unassign`, { criteria: toBody(criteria), pilote, includeTreated }),
};
