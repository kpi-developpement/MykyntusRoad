import { api } from "./api";
import type { LoginResponse, User } from "../types";

export const authService = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { username, password }),
  me: () => api.get<User>("/api/auth/me"),
};
