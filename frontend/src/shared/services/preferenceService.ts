import { api } from "./api";

export interface Preference {
  key: string;
  /** JSON text, null when the user never changed it. */
  value: string | null;
  updatedAt: string | null;
}

/** Settings of the connected account (each profile arranges its own tables), kept on the server. */
export const preferenceService = {
  get: (key: string) => api.get<Preference>(`/api/me/preferences/${encodeURIComponent(key)}`),
  save: (key: string, value: string | null) => api.put<Preference>(`/api/me/preferences/${encodeURIComponent(key)}`, { value }),
};
