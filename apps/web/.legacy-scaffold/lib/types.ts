// Types mirroring the NestJS API contract (apps/api).

export type Role = "ADMIN" | "EMPLOYEE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "TESTING" | "COMPLETED" | "RETURNED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type AssignmentMode = "MANUAL" | "BALANCED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  position: string | null;
  avatarUrl: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface TaskUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  assignedToId: string;
  createdById: string;
  attachmentLink: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  progress: number;
  assignmentMode: AssignmentMode;
  createdAt: string;
  updatedAt: string;
  assignedTo?: TaskUser | null;
  createdBy?: TaskUser | null;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  actorId: string;
  note: string | null;
  createdAt: string;
  actor?: { id: string; name: string };
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: { id: string; name: string; avatarUrl: string | null };
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  taskId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationList extends Paginated<AppNotification> {
  unread: number;
}

export interface AdminStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  testingTasks: number;
  returnedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  activeEmployees: number;
  dueToday: number;
  overdue: number;
}

export interface AdminCharts {
  tasksPerEmployee: { employeeId: string; employeeName: string; count: number }[];
  statusDistribution: { status: TaskStatus; count: number }[];
  priorityDistribution: { priority: Priority; count: number }[];
  completedPerMonth: { month: string; count: number }[];
}

export interface EmployeeStats {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  testingTasks: number;
  completedTasks: number;
  returnedTasks: number;
  dueToday: number;
  overdue: number;
  averageProgress: number;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TaskQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  assignedToId?: string;
}

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "TESTING", "COMPLETED", "RETURNED"];
export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
