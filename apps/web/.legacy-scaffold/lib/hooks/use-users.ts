"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Role, User } from "@/lib/types";

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  role?: Role;
  isActive?: boolean;
  department?: string;
}

export const userKeys = {
  all: ["users"] as const,
  list: (q: UserQuery) => [...userKeys.all, "list", q] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export function useUsers(query: UserQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: async () => (await api.get<Paginated<User>>("/users", { params: query })).data,
    placeholderData: (prev) => prev,
  });
}

/** Lightweight list of active employees for assignment pickers. */
export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: [...userKeys.all, "employees"],
    queryFn: async () =>
      (
        await api.get<Paginated<User>>("/users", {
          params: { role: "EMPLOYEE", isActive: true, limit: 100 },
        })
      ).data.data,
    enabled,
    staleTime: 60_000,
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: userKeys.all });
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
  position?: string;
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => (await api.post<User>("/users", payload)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateUser(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (payload: Partial<User>) => (await api.patch<User>(`/users/${id}`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await api.patch<User>(`/users/${id}/${active ? "enable" : "disable"}`)).data,
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) =>
      (await api.post(`/users/${id}/reset-password`, { newPassword })).data,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: invalidate,
  });
}
