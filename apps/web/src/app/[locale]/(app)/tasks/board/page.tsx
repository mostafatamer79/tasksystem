'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useTasks, useTaskAction, errorMessage, type TaskAction } from '@/lib/hooks';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/lib/types';
import { StatusBadge, PriorityBadge, statusAccent } from '@/components/shared/badges';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatDate, cn } from '@/lib/utils';

// Drag actions allowed by the backend state machine.
function actionForDrop(
  from: TaskStatus,
  to: TaskStatus,
  isModeratorOrAdmin: boolean,
): TaskAction | null {
  if (from === to) return null;

  if (to === 'PUBLISHED') {
    if (isModeratorOrAdmin && (from === 'COMPLETED' || from === 'TESTING')) return 'approve';
    return null;
  }

  if (!isModeratorOrAdmin) {
    if (from === 'TODO' && to === 'IN_PROGRESS') return 'start';
    if (from === 'RETURNED' && to === 'IN_PROGRESS') return 'start';
    if (from === 'IN_PROGRESS' && to === 'TESTING') return 'submit-testing';
    return null;
  }

  if (from === 'TESTING' && to === 'COMPLETED') return 'approve';
  if (from === 'TESTING' && to === 'RETURNED') return 'return';
  if (from === 'COMPLETED' && to === 'RETURNED') return 'return';
  if (from === 'TODO' && to === 'IN_PROGRESS') return 'start';
  if (from === 'RETURNED' && to === 'IN_PROGRESS') return 'start';
  if (from === 'IN_PROGRESS' && to === 'TESTING') return 'submit-testing';
  return null;
}

function TaskCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-3.5 shadow-soft transition-all duration-200',
        overlay
          ? 'rotate-3 scale-105 shadow-lift ring-2 ring-primary/40'
          : 'hover:-translate-y-0.5 hover:shadow-lift hover:border-primary/30',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.assignedTo && (
          <Avatar name={task.assignedTo.name} src={task.assignedTo.avatarUrl} className="h-6 w-6 text-[10px]" />
        )}
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={task.progress} className="h-1 flex-1" />
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{task.progress}%</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{formatDate(task.dueDate)}</p>
    </div>
  );
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-25')}>
      <Link href={`/tasks/${task.id}`} onClick={(e) => e.stopPropagation()} draggable={false}>
        <TaskCard task={task} />
      </Link>
    </div>
  );
}

function BoardColumn({ status, tasks, index }: { status: TaskStatus; tasks: Task[]; index: number }) {
  const t = useTranslations('Board');
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [displayCount, setDisplayCount] = useState(15);

  const visibleTasks = tasks.slice(0, displayCount);
  const hasMore = tasks.length > displayCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      ref={setNodeRef}
      className={cn(
        'glass flex w-72 max-h-[calc(100vh-14rem)] shrink-0 flex-col gap-2.5 rounded-2xl p-3.5 transition-all duration-200',
        isOver && 'shadow-glow scale-[1.01] border-primary/40',
      )}
    >
      {/* status accent bar */}
      <div className={cn('shrink-0 h-1 w-12 rounded-full bg-gradient-to-r', statusAccent[status])} />
      <div className="shrink-0 flex items-center justify-between px-0.5">
        <StatusBadge status={status} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 min-h-32 flex-col gap-2.5 overflow-y-auto pr-1 pb-1">
        {visibleTasks.map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs text-muted-foreground transition-colors',
              isOver && 'border-primary/50 text-primary',
            )}
          >
            {t('dropHere')}
          </div>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => prev + 15)}
            className="flex items-center justify-center gap-1 rounded-xl border bg-muted/40 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted cursor-pointer mt-1"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Load More ({tasks.length - displayCount} remaining)
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function BoardPage() {
  const t = useTranslations('Board');
  const tb = useTranslations('Badges');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const isModeratorOrAdmin = isAdmin || isModerator;

  const [limit, setLimit] = useState(100);
  const tasksQuery = useTasks({ limit, sortBy: 'createdAt', sortOrder: 'desc' }, !isModeratorOrAdmin);
  const taskAction = useTaskAction();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(TASK_STATUSES.map((s) => [s, []]));
    (tasksQuery.data?.data ?? []).forEach((t) => {
      const list = map.get(t.status);
      if (list) list.push(t);
    });
    return map;
  }, [tasksQuery.data]);

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask((e.active.data.current as { task: Task }).task);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const task = (e.active.data.current as { task: Task }).task;
    const to = e.over?.id as TaskStatus | undefined;
    if (!to) return;

    if (to === 'PUBLISHED' && !isModeratorOrAdmin) {
      toast.error('Only Moderators and Admins can publish completed tasks.');
      return;
    }

    const action = actionForDrop(task.status, to, isModeratorOrAdmin);
    if (!action) {
      if (task.status !== to) {
        toast.error(
          t('cannotMove', {
            from: tb((task.status === 'IN_PROGRESS' ? 'inProgress' : task.status.toLowerCase()) as string),
            to: tb((to === 'IN_PROGRESS' ? 'inProgress' : to.toLowerCase()) as string),
          })
        );
      }
      return;
    }
    try {
      await taskAction.mutateAsync({ id: task.id, action });
      toast.success(
        t('movedTo', { status: tb((to === 'IN_PROGRESS' ? 'inProgress' : to.toLowerCase()) as string) })
      );
    } catch (err) {
      toast.error(errorMessage(err, t('transitionNotAllowed')));
    }
  };

  const hasGlobalMore = (tasksQuery.data?.total ?? 0) > (tasksQuery.data?.data?.length ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {isModeratorOrAdmin ? t('adminSubtitle') : t('employeeSubtitle')}
          </p>
        </div>

        {/* Global Load More Button */}
        {hasGlobalMore && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 cursor-pointer"
            onClick={() => setLimit((prev) => prev + 100)}
            disabled={tasksQuery.isFetching}
          >
            {tasksQuery.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Load More Tasks ({tasksQuery.data!.total - tasksQuery.data!.data.length})
          </Button>
        )}
      </div>

      {tasksQuery.isLoading ? (
        <div className="flex gap-3.5 overflow-x-auto pb-4">
          {TASK_STATUSES.map((s) => (
            <Skeleton key={s} className="h-80 w-72 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : (tasksQuery.data?.total ?? 0) === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={isModeratorOrAdmin ? t('emptyAdminDescription') : t('emptyEmployeeDescription')}
          className="py-24"
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3.5 overflow-x-auto pb-4">
            {TASK_STATUSES.map((s, i) => (
              <BoardColumn key={s} status={s} tasks={byStatus.get(s) ?? []} index={i} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 0.2 }}>
            {activeTask && <TaskCard task={activeTask} overlay />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
