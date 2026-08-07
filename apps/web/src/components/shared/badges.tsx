import { cn } from '@/lib/utils';
import type { Priority, TaskStatus } from '@/lib/types';

const statusStyles: Record<TaskStatus, { pill: string; dot: string }> = {
  TODO: { pill: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20', dot: 'bg-slate-400' },
  IN_PROGRESS: { pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25', dot: 'bg-blue-500 animate-pulse-dot' },
  TESTING: { pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25', dot: 'bg-amber-500 animate-pulse-dot' },
  COMPLETED: { pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
  RETURNED: { pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25', dot: 'bg-rose-500' },
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  TESTING: 'Testing',
  COMPLETED: 'Completed',
  RETURNED: 'Returned',
};

const priorityStyles: Record<Priority, { pill: string; dot: string }> = {
  LOW: { pill: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20', dot: 'bg-slate-400' },
  MEDIUM: { pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25', dot: 'bg-sky-500' },
  HIGH: { pill: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25', dot: 'bg-orange-500' },
  URGENT: { pill: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', dot: 'bg-red-500 animate-pulse-dot' },
};

// Accent bar colors per status (used by the Kanban columns).
export const statusAccent: Record<TaskStatus, string> = {
  TODO: 'from-slate-400 to-slate-500',
  IN_PROGRESS: 'from-blue-400 to-indigo-500',
  TESTING: 'from-amber-400 to-orange-500',
  COMPLETED: 'from-emerald-400 to-teal-500',
  RETURNED: 'from-rose-400 to-red-500',
};

function Pill({
  label,
  dot,
  className,
}: {
  label: string;
  dot: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const s = statusStyles[status];
  return <Pill label={statusLabels[status]} dot={s.dot} className={cn(s.pill, className)} />;
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const p = priorityStyles[priority];
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();
  return <Pill label={label} dot={p.dot} className={cn(p.pill, className)} />;
}

export { statusLabels };
