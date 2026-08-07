"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminCharts, AdminStats, EmployeeStats } from "@/lib/types";

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "admin", "stats"],
    queryFn: async () => (await api.get<AdminStats>("/dashboard/admin/stats")).data,
    enabled,
  });
}

export function useAdminCharts(enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "admin", "charts"],
    queryFn: async () => (await api.get<AdminCharts>("/dashboard/admin/charts")).data,
    enabled,
  });
}

export function useEmployeeStats(enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "employee", "stats"],
    queryFn: async () => (await api.get<EmployeeStats>("/dashboard/employee/stats")).data,
    enabled,
  });
}
