"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationList } from "@/lib/types";

const key = (page: number, limit: number) => ["notifications", { page, limit }] as const;

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: key(page, limit),
    queryFn: async () =>
      (await api.get<NotificationList>("/notifications", { params: { page, limit } })).data,
    placeholderData: (prev) => prev,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch("/notifications/read-all")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) =>
      (await api.post("/auth/change-password", payload)).data,
  });
}
