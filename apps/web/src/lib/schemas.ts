import { z } from 'zod';

// Zod schemas mirroring backend DTOs.

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const taskStatusEnum = z.enum(['DRAFT', 'PENDING', 'TODO', 'IN_PROGRESS', 'TESTING', 'WAITING_FOR_REVIEW', 'WAITING_FOR_PUBLISHING', 'COMPLETED', 'RETURNED', 'PUBLISHED', 'REJECTED', 'CANCELLED']);
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const roleEnum = z.enum(['ADMIN', 'MODERATOR', 'EMPLOYEE']);

export const nextTaskDefinitionSchema: z.ZodType<import('./types').NextTaskDefinition> = z.lazy(() =>
  z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional(),
    assigneeId: z.string().optional(),
    assigneeRole: roleEnum.optional(),
    dueDays: z.coerce.number().optional(),
    priority: priorityEnum.optional(),
    requiresPublishing: z.boolean().optional(),
    condition: z.enum(['ON_SUCCESS', 'ON_RETURN']).optional(),
    nextTasks: z.array(nextTaskDefinitionSchema).optional(),
  }),
);

export const createTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    workflowTemplateId: z.string().optional(),
    description: z.string().optional(),
    priority: priorityEnum,
    dueDate: z.string().optional(),
    assignmentMode: z.enum(['MANUAL', 'BALANCED']),
    assignedToId: z.string().optional(),
    attachmentLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    estimatedHours: z.number().min(0).optional(),

    isAutomated: z.boolean().optional(),
    triggerStatus: taskStatusEnum.optional(),
    nextTaskTitle: z.string().optional(),
    nextTaskDescription: z.string().optional(),
    nextTaskAssigneeId: z.string().optional(),
    nextTaskAssigneeRole: roleEnum.optional(),
    nextTaskDueDays: z.coerce.number().optional(),
    nextTaskPriority: priorityEnum.optional(),
    requiresPublishing: z.boolean().optional(),
    nextTasks: z.array(nextTaskDefinitionSchema).optional(),

  })
  .refine((v) => v.assignmentMode !== 'MANUAL' || !!v.assignedToId, {
    path: ['assignedToId'],
    message: 'Select an employee for manual assignment',
  });
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  workflowTemplateId: z.string().optional(),
  description: z.string().optional(),
  priority: priorityEnum.optional(),
  status: taskStatusEnum.optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  attachmentLink: z.string().url().optional().or(z.literal('')),
  estimatedHours: z.coerce.number().min(0).optional(),
  actualHours: z.coerce.number().min(0).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),

    isAutomated: z.boolean().optional(),
    triggerStatus: taskStatusEnum.optional(),
    nextTaskTitle: z.string().optional(),
    nextTaskDescription: z.string().optional(),
    nextTaskAssigneeId: z.string().optional(),
    nextTaskAssigneeRole: roleEnum.optional(),
    nextTaskDueDays: z.coerce.number().optional(),
    nextTaskPriority: priorityEnum.optional(),
    requiresPublishing: z.boolean().optional(),
    nextTasks: z.array(nextTaskDefinitionSchema).optional(),

});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(2000),
});

export const planTaskSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  dayName: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  workflowTemplateId: z.string().optional(),
  content: z.string().optional(),
  material: z.string().optional(),
  notes: z.string().optional(),
  isReady: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  taskId: z.string().uuid().optional(),

  isAutomated: z.boolean().optional(),
  nextTaskTitle: z.string().optional(),
  nextTaskDescription: z.string().optional(),
  nextTaskAssigneeId: z.string().optional(),
  nextTaskAssigneeRole: roleEnum.optional(),
  nextTaskDueDays: z.coerce.number().optional(),
  nextTaskPriority: priorityEnum.optional(),
  requiresPublishing: z.boolean().optional(),
  nextTasks: z.array(nextTaskDefinitionSchema).optional(),
});

export const createPlanSchema = z.object({
  title: z.string().min(1, 'Plan title is required').max(200),
  teacherName: z.string().min(1, 'Teacher name is required'),
  description: z.string().optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  tasks: z.array(planTaskSchema).optional(),
});

export const returnPlanSchema = z.object({
  note: z.string().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof createPlanSchema>;
export type CreatePlanTaskInput = z.infer<typeof planTaskSchema>;
export type UpdatePlanTaskInput = z.infer<typeof planTaskSchema>;

export const commentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(2000),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const returnTaskSchema = z.object({
  note: z.string().optional(),
});
export type ReturnTaskInput = z.infer<typeof returnTaskSchema>;


export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleEnum,
  department: z.string().optional(),
  position: z.string().optional(),
  workStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:mm format').optional(),
  workEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:mm format').optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: roleEnum.optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  isActive: z.boolean().optional(),
  workStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  workEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
