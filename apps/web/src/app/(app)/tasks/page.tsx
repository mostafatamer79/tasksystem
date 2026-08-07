'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { useTasks, useDeleteTask, useEmployees, errorMessage } from '@/lib/hooks';
import { PRIORITIES, TASK_STATUSES, type Priority, type Task, type TaskStatus } from '@/lib/types';
import { formatDate, remainingDays, cn } from '@/lib/utils';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusBadge, PriorityBadge, statusLabels } from '@/components/shared/badges';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ui/dialog';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { motion } from 'framer-motion';

export default function TasksPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [assignedToId, setAssignedToId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const query = {
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    assignedToId: assignedToId || undefined,
    sortBy,
    sortOrder,
  };
  const tasks = useTasks(query, !isAdmin);
  const employees = useEmployees(isAdmin);
  const deleteTask = useDeleteTask();

  const onSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      sortKey: 'title',
      cell: (t) => (
        <div className="max-w-[280px]">
          <p className="truncate font-medium">{t.title}</p>
          {t.description && <p className="truncate text-xs text-muted-foreground">{t.description}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'priority', header: 'Priority', cell: (t) => <PriorityBadge priority={t.priority} /> },
    ...(isAdmin
      ? [
          {
            key: 'assignee',
            header: 'Assignee',
            cell: (t: Task) =>
              t.assignedTo ? (
                <div className="flex items-center gap-2">
                  <Avatar name={t.assignedTo.name} src={t.assignedTo.avatarUrl} className="h-6 w-6 text-[10px]" />
                  <span className="whitespace-nowrap text-sm">{t.assignedTo.name}</span>
                </div>
              ) : (
                '—'
              ),
          } satisfies Column<Task>,
        ]
      : []),
    {
      key: 'dueDate',
      header: 'Due',
      sortable: true,
      sortKey: 'dueDate',
      cell: (t) => {
        const days = remainingDays(t.dueDate);
        return (
          <div className="whitespace-nowrap">
            <p>{formatDate(t.dueDate)}</p>
            {days !== null && t.status !== 'COMPLETED' && (
              <p className={cn('text-xs', days < 0 ? 'text-destructive' : days <= 1 ? 'text-amber-500' : 'text-muted-foreground')}>
                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      cell: (t) => (
        <div className="flex w-28 items-center gap-2">
          <Progress value={t.progress} className="h-1.5" />
          <span className="text-xs text-muted-foreground">{t.progress}%</span>
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-24',
            cell: (t: Task) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditTask(t);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => setDeleteTarget(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          } satisfies Column<Task>,
        ]
      : []),
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isAdmin ? 'Tasks' : 'My Tasks'}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'All team tasks' : 'Tasks assigned to you'}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditTask(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TaskStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as Priority | '');
            setPage(1);
          }}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        {isAdmin && (
          <Select
            className="w-44"
            value={assignedToId}
            onChange={(e) => {
              setAssignedToId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All assignees</option>
            {(employees.data?.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <DataTable
        columns={columns.map((c) => ({ ...c, sortable: c.sortable }))}
        data={tasks.data?.data ?? []}
        rowKey={(t) => t.id}
        loading={tasks.isLoading}
        emptyTitle="No tasks found"
        emptyDescription="Try adjusting your filters, or create a new task."
        onRowClick={(t) => router.push(`/tasks/${t.id}`)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      <Pagination
        page={tasks.data?.page ?? page}
        totalPages={tasks.data?.totalPages ?? 1}
        total={tasks.data?.total ?? 0}
        onPageChange={setPage}
      />

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editTask} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete task?"
        description={`"${deleteTarget?.title}" will be permanently deleted with its history and comments.`}
        confirmLabel="Delete"
        destructive
        loading={deleteTask.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteTask.mutateAsync(deleteTarget.id);
            toast.success('Task deleted');
            setDeleteTarget(null);
          } catch (err) {
            toast.error(errorMessage(err, 'Failed to delete task'));
          }
        }}
      />
    </motion.div>
  );
}
