// Types mirroring the backend API contract (apps/api).

export const ROLES = ['ADMIN', 'EMPLOYEE', 'MODERATOR'] as const;
export type Role = (typeof ROLES)[number];
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED' | 'RETURNED' | 'PUBLISHED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AssignmentMode = 'MANUAL' | 'BALANCED';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'RETURNED', 'PUBLISHED'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  position: string | null;
  avatarUrl: string | null;
  workStartTime: string;
  workEndTime: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface TaskUserRef {
  id: string;
  name: string;
  email?: string;
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
  assignedTo?: TaskUserRef;
  createdBy?: TaskUserRef;
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
  author?: { id: string; name: string; avatarUrl?: string | null };
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

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'RETURNED';
export const PLAN_STATUSES: PlanStatus[] = ['DRAFT', 'SUBMITTED', 'PUBLISHED', 'RETURNED'];

export interface PlanTask {
  id: string;
  planId: string;
  sortOrder: number;
  date: string;
  dayName: string | null;
  title: string;
  content: string | null;
  material: string | null;
  notes: string | null;
  isReady: boolean;
  taskId?: string | null;
  task?: Task;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  title: string;
  teacherName: string;
  description: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: PlanStatus;
  returnNote: string | null;
  createdById: string;
  createdBy: { id: string; name: string; email: string; avatarUrl: string | null };
  reviewedById: string | null;
  reviewedBy: { id: string; name: string } | null;
  publishedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: PlanTask[];
}

export interface PlanQuery {
  page?: number;
  limit?: number;
  status?: PlanStatus;
  createdById?: string;
  search?: string;
}

export interface NotificationsPage extends Paginated<AppNotification> {
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

export interface EmployeeTaskStats {
  employeeId: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  avatarUrl: string | null;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  testingTasks: number;
  completedTasks: number;
  returnedTasks: number;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AttendancePause {
  id: string;
  attendanceId: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  pauses: AttendancePause[];
  totalPausedSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  assignedToId?: string;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: Role;
  isActive?: boolean;
  department?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}
