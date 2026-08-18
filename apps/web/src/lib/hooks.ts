'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from './api';
import type {
  AdminCharts,
  AdminStats,
  Attendance,
  Comment,
  EmployeeStats,
  EmployeeTaskStats,
  NotificationsPage,
  Paginated,
  Task,
  TaskHistoryEntry,
  TaskQuery,
  User,
  UserQuery,
} from './types';

import type {
  CreateTaskInput,
  CreateUserInput,
  UpdateTaskInput,
  UpdateUserInput,
  CreatePlanInput,
  UpdatePlanInput,
  CreatePlanTaskInput,
} from './schemas';

// ---------- Auth / dashboard ----------

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'admin', 'stats'],
    queryFn: async () => (await api.get<AdminStats>('/dashboard/admin/stats')).data,
    enabled,
  });
}

export function useAdminCharts(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'admin', 'charts'],
    queryFn: async () => (await api.get<AdminCharts>('/dashboard/admin/charts')).data,
    enabled,
  });
}

export function useEmployeeStats(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'employee', 'stats'],
    queryFn: async () => (await api.get<EmployeeStats>('/dashboard/employee/stats')).data,
    enabled,
  });
}

export function useAdminEmployeesStats(date?: string, enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'admin', 'employees-stats', date ?? 'all'],
    queryFn: async () =>
      (await api.get<EmployeeTaskStats[]>('/dashboard/admin/employees-stats', { params: date ? { date } : {} })).data,
    enabled,
  });
}

// ---------- Tasks ----------

export function useTasks(query: TaskQuery, my = false) {
  return useQuery({
    queryKey: ['tasks', my ? 'my' : 'all', query],
    queryFn: async () =>
      (await api.get<Paginated<Task>>(my ? '/tasks/my' : '/tasks', { params: query })).data,
    placeholderData: (prev) => prev,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: async () => (await api.get<Task>(`/tasks/${id}`)).data,
    enabled: !!id,
  });
}

export function useTaskHistory(id: string) {
  return useQuery({
    queryKey: ['tasks', 'history', id],
    queryFn: async () => (await api.get<TaskHistoryEntry[]>(`/tasks/${id}/history`)).data,
    enabled: !!id,
  });
}

export function useTaskComments(id: string) {
  return useQuery({
    queryKey: ['tasks', 'comments', id],
    queryFn: async () => (await api.get<Comment[]>(`/tasks/${id}/comments`)).data,
    enabled: !!id,
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    if (id) {
      qc.invalidateQueries({ queryKey: ['tasks', 'history', id] });
      qc.invalidateQueries({ queryKey: ['tasks', 'comments', id] });
    }
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => (await api.post<Task>('/tasks', input)).data,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask(id: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => (await api.patch<Task>(`/tasks/${id}`, input)).data,
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

export type TaskAction = 'start' | 'submit-testing' | 'approve' | 'publish' | 'return' | 'progress';

// ---------- Plans ----------

export function usePlans(query: import('./types').PlanQuery) {
  return useQuery({
    queryKey: ['plans', query],
    queryFn: async () =>
      (await api.get<Paginated<import('./types').Plan>>('/plans', { params: query })).data,
    placeholderData: (prev) => prev,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ['plans', 'detail', id],
    queryFn: async () => (await api.get<import('./types').Plan>(`/plans/${id}`)).data,
    enabled: !!id,
  });
}

function useInvalidatePlans() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['plans'] });
    if (id) qc.invalidateQueries({ queryKey: ['plans', 'detail', id] });
  };
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: CreatePlanInput) =>
      (await api.post<import('./types').Plan>('/plans', input)).data,
    onSuccess: () => invalidate(),
  });
}

export function useUpdatePlan(id: string) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: UpdatePlanInput) =>
      (await api.patch<import('./types').Plan>(`/plans/${id}`, input)).data,
    onSuccess: () => invalidate(id),
  });
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/plans/${id}`)).data,
    onSuccess: () => invalidate(),
  });
}

export function usePlanAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: 'submit' | 'publish' | 'return'; note?: string }) =>
      (await api.post<import('./types').Plan>(`/plans/${id}/${action}`, note ? { note } : {})).data,
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['plans', 'detail', id] });
    },
  });
}

export function useBulkUpsertPlanTasks(planId: string) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (tasks: (CreatePlanTaskInput & { id?: string })[]) =>
      (await api.put<import('./types').PlanTask[]>(`/plans/${planId}/tasks`, tasks)).data,
    onSuccess: () => invalidate(planId),
  });
}

// ---------- Attendance ----------

export function useAttendanceToday() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => (await api.get<Attendance>('/attendance/today')).data,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Attendance>('/attendance/check-in', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Attendance>('/attendance/check-out', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useStartPause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Attendance>('/attendance/pause/start', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useEndPause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Attendance>('/attendance/pause/end', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useTaskAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; action: TaskAction; note?: string; progress?: number }) => {
      const { id, action, note, progress } = args;
      if (action === 'progress') {
        return (await api.patch<Task>(`/tasks/${id}/progress`, { progress })).data;
      }
      return (await api.post<Task>(`/tasks/${id}/${action}`, action === 'return' ? { note } : {})).data;
    },
    onMutate: async ({ id, action, progress }) => {
      // Optimistic status/progress update across cached task lists.
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const nextStatus: Record<string, Task['status'] | undefined> = {
        start: 'IN_PROGRESS',
        'submit-testing': 'TESTING',
        approve: 'COMPLETED',
        publish: 'PUBLISHED',
        return: 'RETURNED',
        progress: undefined,
      };
      const status = nextStatus[action];
      const snapshots = qc.getQueriesData<Paginated<Task>>({ queryKey: ['tasks'] });
      snapshots.forEach(([key, data]) => {
        if (!data?.data) return;
        qc.setQueryData<Paginated<Task>>(key, {
          ...data,
          data: data.data.map((t) =>
            t.id === id
              ? { ...t, ...(status ? { status } : {}), ...(progress != null ? { progress } : {}) }
              : t,
          ),
        });
      });
      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      throw err;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'history', vars.id] });
    },
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post<Comment>(`/tasks/${taskId}/comments`, { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'comments', taskId] }),
  });
}

// ---------- Users (admin) ----------

export function useUsers(query: UserQuery, enabled = true) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: async () => (await api.get<Paginated<User>>('/users', { params: query })).data,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: ['users', 'employees'],
    queryFn: async () => {
      const res = await api.get<Paginated<User>>('/users', {
        params: { isActive: true, limit: 100 },
      });
      return {
        ...res.data,
        data: res.data.data.filter((u) => u.role === 'EMPLOYEE' || u.role === 'MODERATOR'),
      };
    },
    enabled,
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['users'] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => (await api.post<User>('/users', input)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateUser(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: UpdateUserInput) => (await api.patch<User>(`/users/${id}`, input)).data,
    onSuccess: invalidate,
  });
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await api.patch<User>(`/users/${id}/${active ? 'enable' : 'disable'}`)).data,
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

// ---------- Notifications ----------

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: async () =>
      (await api.get<NotificationsPage>('/notifications', { params: { page, limit } })).data,
    placeholderData: (prev) => prev,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---------- Profile ----------

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) =>
      (await api.post('/auth/change-password', input)).data,
  });
}

export { errorMessage };
