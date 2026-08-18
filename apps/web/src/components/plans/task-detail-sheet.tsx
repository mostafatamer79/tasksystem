'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  CalendarDays,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge, PriorityBadge } from './task-status-badge';
import type { Task, PlanTask } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { useTaskAction } from '@/lib/hooks';
import { toast } from 'sonner';

interface TaskDetailSheetProps {
  planTask: PlanTask | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailSheet({ planTask, open, onClose }: TaskDetailSheetProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Plans');
  const user = useAuthStore((s) => s.user);
  const taskAction = useTaskAction();

  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  const task = planTask?.task as Task | undefined;

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const fmt = (d: string | null | undefined) =>
    d
      ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', { dateStyle: 'medium' }).format(new Date(d))
      : '—';

  const handleModeratorAction = async (action: 'approve' | 'return' | 'publish', note?: string) => {
    if (!task) return;
    try {
      await taskAction.mutateAsync({ id: task.id, action, note });
      toast.success(action === 'return' ? 'Task returned for rework' : 'Task Published / Approved');
    } catch (_err) {
      toast.error('Failed to update task status');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l bg-background shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {task && <TaskStatusBadge status={task.status} size="sm" />}
                {task && <PriorityBadge priority={task.priority} size="sm" />}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-5 space-y-5">
              {/* Plan Task Title */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  {t('planTask')}
                </p>
                <h2 className="text-xl font-bold leading-tight text-foreground">
                  {task?.title || planTask?.title}
                </h2>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{fmt(planTask?.date)}</span>
              </div>

              {!task ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-10 text-center text-muted-foreground">
                  <AlertCircle className="mb-3 h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">{t('noLinkedTask')}</p>
                  <p className="mt-1 text-xs opacity-70">{t('noLinkedTaskDesc')}</p>
                </div>
              ) : (
                <>
                  {/* Task Title */}
                  <div className="rounded-2xl border bg-muted/30 p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t('linkedTask')}
                    </p>
                    <h3 className="font-semibold text-base leading-snug">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mt-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Moderator Status Management - Only appears when task is COMPLETED or TESTING */}
                  {isModeratorOrAdmin && (task.status === 'COMPLETED' || task.status === 'TESTING') ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{t('moderatorControlTitle')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('moderatorControlDesc')}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs cursor-pointer"
                          disabled={taskAction.isPending}
                          onClick={() => handleModeratorAction(task.status === 'COMPLETED' ? 'publish' : 'approve')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('publishTask')}
                        </Button>
                        {task.status === 'TESTING' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5 text-xs cursor-pointer"
                            disabled={taskAction.isPending}
                            onClick={() => {
                              const note = prompt(t('returnNote') || 'Reason for returning task:');
                              if (note !== null) handleModeratorAction('return', note);
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t('returnTask')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : !isModeratorOrAdmin && (task.status === 'COMPLETED' || task.status === 'TESTING') ? (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
                      <Lock className="h-4 w-4 shrink-0" />
                      <span>{t('taskCompletedLock')}</span>
                    </div>
                  ) : null}

                  {/* Progress */}
                  {task.status === 'IN_PROGRESS' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Assigned To */}
                    <div className="rounded-xl border bg-card p-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned To</p>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                          {task.assignedTo?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium truncate">{task.assignedTo?.name || '—'}</span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="rounded-xl border bg-card p-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{fmt(task.dueDate)}</span>
                      </div>
                    </div>

                    {/* Created By */}
                    {task.createdBy && (
                      <div className="rounded-xl border bg-card p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created By</p>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{task.createdBy.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Estimated Hours */}
                    {task.estimatedHours != null && (
                      <div className="rounded-xl border bg-card p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est. Hours</p>
                        <span className="text-sm font-medium">{task.estimatedHours}h</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Notes from plan task */}
              {planTask?.notes && (
                <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">Notes</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{planTask.notes}</p>
                </div>
              )}

              {/* Content */}
              {planTask?.content && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Content</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{planTask.content}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {task && (
              <div className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur-sm">
                <Button
                  className="w-full gap-2 group cursor-pointer"
                  onClick={() => {
                    onClose();
                    router.push(`/tasks/${task.id}`);
                  }}
                >
                  View Full Task Details
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
