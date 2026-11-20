import { api } from "./api";
import type { ImportBatch, ImportResult, SourceColumn } from "../types";

export const importService = {
  upload: (file: File, date?: string, onProgress?: (ratio: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<ImportResult>("/api/imports", form, { query: { date }, onProgress });
  },
  history: () => api.get<ImportBatch[]>("/api/imports"),
  sourceColumns: () => api.get<SourceColumn[]>("/api/source-columns"),
  setColumnVisible: (id: number, visible: boolean) => api.put<SourceColumn>(`/api/source-columns/${id}`, { visible }),
};
