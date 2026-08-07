import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const taskSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    dueDate: z.string().optional(),
    assignmentMode: z.enum(["MANUAL", "BALANCED"]),
    assignedToId: z.string().uuid().optional().or(z.literal("")),
    attachmentLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    estimatedHours: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.assignmentMode !== "MANUAL" || !!v.assignedToId, {
    path: ["assignedToId"],
    message: "Select an employee for manual assignment",
  });
export type TaskInput = z.infer<typeof taskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "TESTING", "COMPLETED", "RETURNED"]).optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
  attachmentLink: z.string().url().optional().or(z.literal("")),
  estimatedHours: z.coerce.number().min(0).optional(),
  actualHours: z.coerce.number().min(0).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  department: z.string().optional(),
  position: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});
export type CommentInput = z.infer<typeof commentSchema>;
