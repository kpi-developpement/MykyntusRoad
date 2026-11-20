import { api } from "./api";
import type { ImportBatch, ImportResult, SecSource } from "../types";

/** The 3 sécurisation files (ADMIN_SECURISATION). */
export const secService = {
  sources: () => api.get<SecSource[]>("/api/sec/sources"),
  history: () => api.get<ImportBatch[]>("/api/sec/imports"),
  upload: (slot: number, file: File, onProgress?: (ratio: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<ImportResult>(`/api/sec/imports/${slot}`, form, { onProgress });
  },
};
