'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Workflow,
  ArrowRight,
  Circle,
  PlayCircle,
  FlaskConical,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge, PriorityBadge, STATUS_CONFIG } from './task-status-badge';
import type { Task, PlanTask, TaskStatus } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { useTaskAction, useTaskFlow } from '@/lib/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaskDetailSheetProps {
  planTask: PlanTask | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_ICON: Record<TaskStatus, React.ElementType> = {
  TODO: Circle,
  IN_PROGRESS: PlayCircle,
  TESTING: FlaskConical,
  WAITING_FOR_PUBLISHING: Globe2,
  COMPLETED: CheckCircle2,
  RETURNED: RotateCcw,
  PUBLISHED: Globe2,
};

function statusGlow(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    TODO: 'shadow-slate-500/20',
    IN_PROGRESS: 'shadow-blue-500/30',
    TESTING: 'shadow-amber-500/30',
    WAITING_FOR_PUBLISHING: 'shadow-purple-500/30',
    COMPLETED: 'shadow-emerald-500/30',
    RETURNED: 'shadow-red-500/30',
    PUBLISHED: 'shadow-purple-500/30',
  };
  return map[status];
}

function TimelineNode({
  status,
  isCurrent,
  isLast,
}: {
  status: TaskStatus;
  isCurrent: boolean;
  isLast: boolean;
}) {
  const Icon = STATUS_ICON[status];
  const dotClass = STATUS_CONFIG[status].dot;

  return (
    <div className="relative z-10 flex flex-col items-center">
      <motion.div
        initial={false}
        animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background shadow-sm transition-all',
          isCurrent && ['ring-4 ring-primary/15', statusGlow(status)],
          isLast && !isCurrent && 'opacity-80'
        )}
        style={{ borderColor: isCurrent ? 'hsl(var(--primary))' : undefined }}
      >
        <Icon className={cn('h-4 w-4', dotClass)} />
      </motion.div>
    </div>
  );
}

function TimelineCard({
  flowTask,
  isCurrent,
  onClick,
  t,
}: {
  flowTask: Task;
  isCurrent: boolean;
  onClick: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const statusConfig = STATUS_CONFIG[flowTask.status];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'group relative flex-1 rounded-2xl border p-4 text-left transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/5',
        isCurrent
          ? 'bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-primary/30 ring-1 ring-primary/20'
          : 'bg-card border-border/80 hover:border-primary/25'
      )}
    >
      {/* Status-colored accent line */}
      <div
        className={cn(
          'absolute top-4 bottom-4 w-1 rounded-full opacity-60 transition-all group-hover:opacity-100',
          'rtl:right-4 ltr:left-4',
          statusConfig.dot.replace('bg-', 'bg-')
        )}
      />

      <div className={cn('space-y-2', 'rtl:pr-5 ltr:pl-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-semibold text-foreground leading-snug', isCurrent && 'text-primary')}>
              {flowTask.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {flowTask.assignedTo?.name || t('unassigned')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {flowTask.dueDate
                  ? new Date(flowTask.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  : t('noDueDate')}
              </span>
            </div>
          </div>
          <TaskStatusBadge status={flowTask.status} size="sm" />
        </div>

        {isCurrent && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            {t('currentStep')}
          </div>
        )}
      </div>

      {/* Hover tooltip hint */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
}

export function TaskDetailSheet({ planTask, open, onClose }: TaskDetailSheetProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Plans');
  const td = useTranslations('TaskDetail');
  const common = useTranslations('Common');
  const user = useAuthStore((s) => s.user);
  const taskAction = useTaskAction();
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  const task = planTask?.task as Task | undefined;
  const flowQuery = useTaskFlow(task?.id ?? '', open);

  const isRtl = locale === 'ar';

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

  const [progressInput, setProgressInput] = useState<number>(task?.progress ?? 0);

  useEffect(() => {
    setProgressInput(task?.progress ?? 0);
  }, [task?.progress]);

  const isTaskOwner = task?.assignedToId === user?.id;

  const handleAction = async (action: 'start' | 'submit-testing' | 'approve' | 'return' | 'publish' | 'progress', note?: string, progress?: number) => {
    if (!task) return;
    try {
      await taskAction.mutateAsync({ id: task.id, action, note, progress });
      const messages: Record<string, string> = {
        start: td('workStarted'),
        'submit-testing': td('submittedForTesting'),
        approve: td('taskApproved'),
        return: td('taskReturned'),
        publish: td('taskApproved'),
        progress: td('progressUpdated'),
      };
      toast.success(messages[action] || td('taskApproved'));
    } catch {
      toast.error(common('error'));
    }
  };

  const flowTasks = useMemo(() => {
    if (!flowQuery.data) return [];
    return flowQuery.data.map((ft, idx) => ({
      ...ft,
      stepPosition:
        ft.id === task?.id ? 'current' : idx < (flowQuery.data?.findIndex((f) => f.id === task?.id) ?? 0) ? 'past' : 'pending',
    }));
  }, [flowQuery.data, task?.id]);

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
            initial={{ x: isRtl ? '-100%' : '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRtl ? '-100%' : '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={cn(
              'fixed top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l bg-background shadow-2xl flex flex-col',
              isRtl ? 'left-0 border-r border-l-0' : 'right-0 border-l'
            )}
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

                  {/* Task Actions */}
                  {task && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{isModeratorOrAdmin ? t('moderatorControlTitle') : td('actions')}</span>
                      </div>

                      {/* Employee actions */}
                      {(isTaskOwner || isModeratorOrAdmin) && (task.status === 'TODO' || task.status === 'RETURNED') && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs cursor-pointer"
                          disabled={taskAction.isPending}
                          onClick={() => handleAction('start')}
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {td('startWork')}
                        </Button>
                      )}

                      {(isTaskOwner || isModeratorOrAdmin) && task.status === 'IN_PROGRESS' && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 gap-1.5 text-xs cursor-pointer"
                              disabled={taskAction.isPending}
                              onClick={() => handleAction('submit-testing')}
                            >
                              <FlaskConical className="h-3.5 w-3.5" />
                              {td('submitForTesting')}
                            </Button>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-muted-foreground">{td('progress')}</span>
                              <span>{progressInput}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={progressInput}
                                onChange={(e) => setProgressInput(Number(e.target.value))}
                                className="flex-1 h-2 rounded-lg bg-muted accent-primary appearance-none cursor-pointer"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs cursor-pointer"
                                disabled={taskAction.isPending || progressInput === task.progress}
                                onClick={() => handleAction('progress', undefined, progressInput)}
                              >
                                {common('save')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Moderator / Admin actions */}
                      {isModeratorOrAdmin && (task.status === 'TESTING' || task.status === 'COMPLETED') && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {task.status === 'TESTING' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs cursor-pointer"
                              disabled={taskAction.isPending}
                              onClick={() => handleAction('approve')}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {td('approve')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 gap-1.5 text-xs cursor-pointer"
                            disabled={taskAction.isPending}
                            onClick={() => handleAction('publish')}
                          >
                            <Globe2 className="h-3.5 w-3.5" />
                            {td('publishTask')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5 text-xs cursor-pointer"
                            disabled={taskAction.isPending}
                            onClick={() => {
                              const note = prompt(t('returnNote') || td('returnReasonPlaceholder'));
                              if (note !== null) handleAction('return', note);
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {td('returnForRework')}
                          </Button>
                        </div>
                      )}

                      {/* Locked / no actions */}
                      {!isModeratorOrAdmin && !isTaskOwner && (task.status === 'COMPLETED' || task.status === 'TESTING' || task.status === 'PUBLISHED') && (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
                          <Lock className="h-4 w-4 shrink-0" />
                          <span>{t('taskCompletedLock')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Assigned To */}
                    <div className="rounded-xl border bg-card p-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{td('assignee')}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                          {task.assignedTo?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium truncate">{task.assignedTo?.name || '—'}</span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="rounded-xl border bg-card p-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{td('dueDate')}</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{fmt(task.dueDate)}</span>
                      </div>
                    </div>

                    {/* Created By */}
                    {task.createdBy && (
                      <div className="rounded-xl border bg-card p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{td('createdByLabel')}</p>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{task.createdBy.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Estimated Hours */}
                    {task.estimatedHours != null && (
                      <div className="rounded-xl border bg-card p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{td('estHours')}</p>
                        <span className="text-sm font-medium">{task.estimatedHours}h</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Notes from plan task */}
              {planTask?.notes && (
                <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">{td('notes')}</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{planTask.notes}</p>
                </div>
              )}

              {/* Content */}
              {planTask?.content && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{td('content')}</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{planTask.content}</p>
                </div>
              )}

              {/* Task Flow Timeline */}
              {task && (
                <div className="rounded-2xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Workflow className="h-4 w-4 text-primary" />
                      <span>{td('taskFlowTitle')}</span>
                    </div>
                    {flowQuery.isLoading && (
                      <span className="text-xs text-muted-foreground animate-pulse">{common('loading')}</span>
                    )}
                  </div>

                  {flowQuery.isError && (
                    <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                      {common('error')}
                    </div>
                  )}

                  {flowTasks.length > 0 ? (
                    <div className="relative">
                      {/* Vertical connector line with gradient */}
                      <div
                        className={cn(
                          'absolute top-4 bottom-4 w-0.5 rounded-full bg-gradient-to-b from-primary/40 via-border to-border',
                          isRtl ? 'right-[17px]' : 'left-[17px]'
                        )}
                      />

                      <div className="space-y-0">
                        {flowTasks.map((flowTask, index) => {
                          const isCurrent = flowTask.id === task.id;

                          return (
                            <motion.div
                              key={flowTask.id}
                              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
                              className={cn(
                                'relative flex items-start gap-4',
                                index !== flowTasks.length - 1 && 'pb-6'
                              )}
                            >
                              <div className={cn('shrink-0', isRtl ? 'order-2' : 'order-1')}>
                                <TimelineNode
                                  status={flowTask.status}
                                  isCurrent={isCurrent}
                                  isLast={index === flowTasks.length - 1}
                                />
                              </div>

                              <div className={cn('flex-1', isRtl ? 'order-1' : 'order-2')}>
                                <TimelineCard
                                  flowTask={flowTask}
                                  isCurrent={isCurrent}
                                  onClick={() => {
                                    onClose();
                                    router.push(`/tasks/${flowTask.id}`);
                                  }}
                                  t={td}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                      <ArrowRight className={cn('mx-auto mb-2 h-5 w-5 opacity-50', isRtl && 'rotate-180')} />
                      <p>{td('noConnectedTasks')}</p>
                    </div>
                  )}
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
                  {td('details')}
                  <ChevronRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5', isRtl && 'rotate-180')} />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
