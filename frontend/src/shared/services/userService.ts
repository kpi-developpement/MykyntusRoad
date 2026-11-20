import { api } from "./api";
import type { Role, User } from "../types";

export interface UserCreatePayload {
  username: string;
  password: string;
  fullName?: string;
  role: Role;
}

export interface UserUpdatePayload {
  fullName?: string;
  role: Role;
  active: boolean;
  password?: string;
}

export const userService = {
  list: () => api.get<User[]>("/api/users"),
  create: (payload: UserCreatePayload) => api.post<User>("/api/users", payload),
  update: (id: number, payload: UserUpdatePayload) => api.put<User>(`/api/users/${id}`, payload),
  remove: (id: number) => api.delete(`/api/users/${id}`),
};
