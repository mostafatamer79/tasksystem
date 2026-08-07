"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Comment,
  Paginated,
  Task,
  TaskHistoryEntry,
  TaskQuery,
} from "@/lib/types";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (q: TaskQuery) => [...taskKeys.lists(), q] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
  comments: (id: string) => [...taskKeys.detail(id), "comments"] as const,
  history: (id: string) => [...taskKeys.detail(id), "history"] as const,
};

export function useTasks(query: TaskQuery, mine = false) {
  return useQuery({
    queryKey: taskKeys.list({ ...query, mine }),
    queryFn: async () => {
      const res = await api.get<Paginated<Task>>(mine ? "/tasks/my" : "/tasks", { params: query });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => (await api.get<Task>(`/tasks/${id}`)).data,
    enabled: !!id,
  });
}

export function useTaskComments(id: string) {
  return useQuery({
    queryKey: taskKeys.comments(id),
    queryFn: async () => (await api.get<Comment[]>(`/tasks/${id}/comments`)).data,
    enabled: !!id,
  });
}

export function useTaskHistory(id: string) {
  return useQuery({
    queryKey: taskKeys.history(id),
    queryFn: async () => (await api.get<TaskHistoryEntry[]>(`/tasks/${id}/history`)).data,
    enabled: !!id,
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: taskKeys.all });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (id) qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
  };
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assignedToId?: string;
  assignmentMode: "MANUAL" | "BALANCED";
  attachmentLink?: string;
  estimatedHours?: number;
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) =>
      (await api.post<Task>("/tasks", payload)).data,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask(id: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (payload: Partial<Task>) =>
      (await api.patch<Task>(`/tasks/${id}`, payload)).data,
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/tasks/${id}`)).data,
    onSuccess: () => invalidate(),
  });
}

// ---- State machine transitions ----
export type TransitionAction = "start" | "submit-testing" | "approve" | "return";

export function useTaskTransition() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: TransitionAction; note?: string }) =>
      (await api.post<Task>(`/tasks/${id}/${action}`, action === "return" ? { note } : undefined)).data,
    onSuccess: (task) => invalidate(task.id),
  });
}

export function useUpdateProgress(id: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (progress: number) =>
      (await api.patch<Task>(`/tasks/${id}/progress`, { progress })).data,
    onSuccess: () => invalidate(id),
  });
}

export function useAddComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post<Comment>(`/tasks/${id}/comments`, { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.comments(id) }),
  });
}
