'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { useAuthStore } from '@/lib/store';
import { useTasks, useTaskAction, errorMessage, type TaskAction } from '@/lib/hooks';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/lib/types';
import { StatusBadge, PriorityBadge, statusLabels, statusAccent } from '@/components/shared/badges';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { Progress } from '@/components/ui/progress';
import { formatDate, cn } from '@/lib/utils';

// Drag actions allowed by the backend state machine.
function actionForDrop(
  from: TaskStatus,
  to: TaskStatus,
  isAdmin: boolean,
): TaskAction | null {
  if (from === to) return null;
  if (!isAdmin) {
    if (from === 'TODO' && to === 'IN_PROGRESS') return 'start';
    if (from === 'RETURNED' && to === 'IN_PROGRESS') return 'start';
    if (from === 'IN_PROGRESS' && to === 'TESTING') return 'submit-testing';
    return null;
  }
  if (from === 'TESTING' && to === 'COMPLETED') return 'approve';
  if (from === 'TESTING' && to === 'RETURNED') return 'return';
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
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      ref={setNodeRef}
      className={cn(
        'glass flex w-68 shrink-0 flex-col gap-2.5 rounded-2xl p-3 transition-all duration-200',
        isOver && 'shadow-glow scale-[1.02]',
      )}
    >
      {/* status accent bar */}
      <div className={cn('h-1 w-10 rounded-full bg-gradient-to-r', statusAccent[status])} />
      <div className="flex items-center justify-between px-0.5">
        <StatusBadge status={status} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="flex min-h-28 flex-col gap-2.5">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs text-muted-foreground transition-colors',
              isOver && 'border-primary/50 text-primary',
            )}
          >
            Drop here
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function BoardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const tasksQuery = useTasks({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }, !isAdmin);
  const taskAction = useTaskAction();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(TASK_STATUSES.map((s) => [s, []]));
    (tasksQuery.data?.data ?? []).forEach((t) => map.get(t.status)?.push(t));
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
    const action = actionForDrop(task.status, to, !!isAdmin);
    if (!action) {
      if (task.status !== to) {
        toast.error(`Cannot move from ${statusLabels[task.status]} to ${statusLabels[to]}`);
      }
      return;
    }
    try {
      await taskAction.mutateAsync({ id: task.id, action });
      toast.success(`Moved to ${statusLabels[to]}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Transition not allowed'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Drag cards to approve or return tasks in testing'
            : 'Drag cards to start work or submit for testing'}
        </p>
      </div>
      {tasksQuery.isLoading ? (
        <div className="flex gap-3.5 overflow-x-auto pb-4">
          {TASK_STATUSES.map((s) => (
            <Skeleton key={s} className="h-80 w-68 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : (tasksQuery.data?.total ?? 0) === 0 ? (
        <EmptyState
          title="No tasks on the board"
          description={isAdmin ? 'Create a task to get started.' : 'Nothing assigned to you yet.'}
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
