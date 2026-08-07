import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

const config: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  TODO: { label: "To Do", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20", dot: "bg-slate-400" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  TESTING: { label: "Testing", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  COMPLETED: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  RETURNED: { label: "Returned", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", dot: "bg-rose-500" },
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  TESTING: "#f59e0b",
  COMPLETED: "#10b981",
  RETURNED: "#f43f5e",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

export function statusLabel(status: TaskStatus) {
  return config[status].label;
}
