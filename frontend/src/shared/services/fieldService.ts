import { api } from "./api";
import type { AppField, FieldOption, FieldSection, FieldType } from "../types";

export interface FieldPayload {
  label: string;
  section: FieldSection;
  type: FieldType;
  position?: number;
  active?: boolean;
  published?: boolean;
}

export interface OptionPayload {
  value: string;
  position?: number;
  active?: boolean;
}

export const fieldService = {
  list: () => api.get<AppField[]>("/api/fields"),
  create: (payload: FieldPayload) => api.post<AppField>("/api/fields", payload),
  update: (id: number, payload: FieldPayload) => api.put<AppField>(`/api/fields/${id}`, payload),
  remove: (id: number) => api.delete(`/api/fields/${id}`),
  addOption: (fieldId: number, payload: OptionPayload) =>
    api.post<FieldOption>(`/api/fields/${fieldId}/options`, payload),
  updateOption: (fieldId: number, optionId: number, payload: OptionPayload) =>
    api.put<FieldOption>(`/api/fields/${fieldId}/options/${optionId}`, payload),
  removeOption: (fieldId: number, optionId: number) => api.delete(`/api/fields/${fieldId}/options/${optionId}`),
};
