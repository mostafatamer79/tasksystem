'use client';

import { cn } from '@/lib/utils';
import type { TaskStatus, Priority } from '@/lib/types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  TODO: {
    label: 'To Do',
    className: 'bg-muted/80 text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  TESTING: {
    label: 'Testing',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  RETURNED: {
    label: 'Returned',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
  PUBLISHED: {
    label: 'Published',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dot: 'bg-purple-500',
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  HIGH: { label: 'High', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  URGENT: { label: 'Urgent', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export function TaskStatusBadge({ status, size = 'md', showDot = true, className }: TaskStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        config.className,
        className
      )}
    >
      {showDot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />}
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
  className?: string;
}

export function PriorityBadge({ priority, size = 'md', className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG, PRIORITY_CONFIG };
