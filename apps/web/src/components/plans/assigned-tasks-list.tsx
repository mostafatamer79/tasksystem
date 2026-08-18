'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { format, isSameMonth } from 'date-fns';
import {
  CalendarDays,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  LayoutList,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { TaskStatusBadge, PriorityBadge } from './task-status-badge';
import { TaskDetailSheet } from './task-detail-sheet';
import type { PlanTask, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/pagination';

interface AssignedTasksListProps {
  tasks: PlanTask[];
  canEdit: boolean;
  currentMonth: Date;
  onRemove: (index: number) => void;
  locale: string;
}

export function AssignedTasksList({
  tasks,
  canEdit,
  currentMonth,
  onRemove,
  locale,
}: AssignedTasksListProps) {
  const t = useTranslations('Plans');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const [selectedPlanTask, setSelectedPlanTask] = useState<PlanTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filterScope, setFilterScope] = useState<'month' | 'all'>('month');
  const [page, setPage] = useState(1);
  const pageSize = 7;

  const formattedMonthName = useMemo(() => {
    return format(currentMonth, 'MMMM yyyy');
  }, [currentMonth]);

  // Filter tasks based on selected filterScope (month or all)
  const displayTasks = useMemo(() => {
    if (filterScope === 'all') return tasks;
    return tasks.filter((t) => {
      if (!t.date) return false;
      return isSameMonth(new Date(t.date), currentMonth);
    });
  }, [tasks, filterScope, currentMonth]);

  const monthTasksCount = useMemo(() => {
    return tasks.filter((t) => t.date && isSameMonth(new Date(t.date), currentMonth)).length;
  }, [tasks, currentMonth]);

  // Reset to first page when filter scope or task list changes
  useEffect(() => {
    setPage(1);
  }, [filterScope, currentMonth, tasks.length]);

  const totalPages = Math.max(1, Math.ceil(displayTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayTasks.slice(start, start + pageSize);
  }, [displayTasks, page]);

  const fmt = (d: string | null | undefined) =>
    d
      ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(new Date(d))
      : '—';

  return (
    <>
      {/* Header controls & filter tabs */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Scope filter pill */}
          <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterScope('month')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                filterScope === 'month'
                  ? 'bg-background shadow-xs text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{formattedMonthName}</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {monthTasksCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                filterScope === 'all'
                  ? 'bg-background shadow-xs text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>All Tasks</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
                {tasks.length}
              </span>
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-lg p-0 cursor-pointer',
                viewMode === 'table' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-lg p-0 cursor-pointer',
                viewMode === 'cards' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {displayTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/10 py-10 text-center"
        >
          <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">
            {filterScope === 'month'
              ? `No tasks for ${formattedMonthName}`
              : t('noTasksAssigned')}
          </p>
          {filterScope === 'month' && tasks.length > 0 && (
            <button
              onClick={() => setFilterScope('all')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              View all {tasks.length} tasks in plan
            </button>
          )}
        </motion.div>
      ) : viewMode === 'table' ? (
        /* Structured Table View */
        <div className="glass overflow-x-auto rounded-2xl border shadow-soft">
          <table className="w-full text-left text-sm rtl:text-right">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Task Title</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Assignee</th>
                <th className="px-4 py-3.5 text-right rtl:text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedTasks.map((planTask, index) => {
                const task = planTask.task as Task | undefined;
                const originalIndex = tasks.findIndex((t) => t.id === planTask.id);
                return (
                  <tr
                    key={(planTask.id as string) || index}
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPlanTask(planTask);
                      setSheetOpen(true);
                    }}
                  >
                    {/* Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-primary">
                      {fmt(planTask.date)}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5 max-w-[220px] truncate font-semibold text-foreground">
                      {task?.title || planTask.title}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task ? <TaskStatusBadge status={task.status} size="sm" /> : '—'}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task ? <PriorityBadge priority={task.priority} size="sm" /> : '—'}
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task?.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                            {task.assignedTo.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="truncate max-w-[140px]">{task.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3.5 text-right rtl:text-left whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlanTask(planTask);
                            setSheetOpen(true);
                          }}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {task && (
                          <button
                            type="button"
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-primary transition-colors cursor-pointer"
                            title="Go to Task"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onRemove(originalIndex >= 0 ? originalIndex : index)}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title={tCommon('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View */
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {paginatedTasks.map((planTask, index) => {
            const task = planTask.task as Task | undefined;
            const originalIndex = tasks.findIndex((t) => t.id === planTask.id);
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
                }}
                key={(planTask.id as string) || index}
                className="group relative rounded-2xl border bg-card p-3.5 shadow-xs transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedPlanTask(planTask);
                  setSheetOpen(true);
                }}
              >
                {/* Remove button */}
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(originalIndex >= 0 ? originalIndex : index);
                    }}
                    className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-xs transition-all hover:scale-110 group-hover:opacity-100 cursor-pointer"
                    title={tCommon('delete')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Date pill & badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {fmt(planTask.date)}
                      </span>
                      {task && <TaskStatusBadge status={task.status} size="sm" />}
                      {task && <PriorityBadge priority={task.priority} size="sm" />}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {task?.title || planTask.title}
                    </p>

                    {/* Assignee */}
                    {task?.assignedTo && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                          {task.assignedTo.name?.[0]?.toUpperCase()}
                        </div>
                        <span>{task.assignedTo.name}</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 mt-1" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {displayTasks.length > pageSize && (
        <div className="pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={displayTasks.length}
            onPageChange={setPage}
          />
        </div>
      )}

      <TaskDetailSheet
        planTask={selectedPlanTask}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
