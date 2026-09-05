'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Search, Trash2, Pencil, BookOpen, CheckCircle2, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import {
  useTasks,
  useDeleteTask,
  useEmployees,
  useTaskAction,
  useBulkDeleteTasks,
  useClearDashboardArchive,
  useRemovePlanTaskFromAnyPlan,
  errorMessage,
} from '@/lib/hooks';
import { PRIORITIES, TASK_STATUSES, type Priority, type Task, type TaskStatus } from '@/lib/types';
import { formatDate, remainingDays, cn } from '@/lib/utils';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusBadge, PriorityBadge } from '@/components/shared/badges';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { motion } from 'framer-motion';

export default function TasksPage() {
  const t = useTranslations('Tasks');
  const tb = useTranslations('Badges');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const isModeratorOrAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [assignedToId, setAssignedToId] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const bulkDelete = useBulkDeleteTasks();
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkScope, setBulkScope] = useState<'selected' | 'all'>('selected');
  const [deleteStatus, setDeleteStatus] = useState<TaskStatus | ''>('');
  const [deleteFromDate, setDeleteFromDate] = useState('');
  const [deleteToDate, setDeleteToDate] = useState('');
  const [removeFromDashboard, setRemoveFromDashboard] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const clearDashboardArchive = useClearDashboardArchive();

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
  const removePlanTask = useRemovePlanTaskFromAnyPlan();
  const taskAction = useTaskAction();
  const isDeleteRangeInvalid = Boolean(
    deleteFromDate && deleteToDate && deleteFromDate > deleteToDate,
  );
  const deleteStatusKey = deleteStatus === 'IN_PROGRESS'
    ? 'inProgress'
    : deleteStatus === 'WAITING_FOR_PUBLISHING'
      ? 'waitingForPublishing'
      : deleteStatus.toLowerCase();
  const deleteSummary = t('bulkDeleteSummary', {
    scope: bulkScope === 'selected' ? t('selectedTasks', { count: selectedKeys.size }) : t('allTasks'),
    status: bulkScope === 'selected'
      ? t('selectedRowsOnly')
      : deleteStatus
        ? tb(deleteStatusKey)
        : t('allStatuses'),
    period: bulkScope === 'selected'
      ? t('selectedRowsOnly')
      : deleteFromDate || deleteToDate
        ? t('selectedDeletePeriod', { from: deleteFromDate || '…', to: deleteToDate || '…' })
        : t('allPeriodsShort'),
    dashboard: removeFromDashboard ? t('dashboardExcluded') : t('dashboardPreserved'),
  });

  const openBulkDelete = (scope: 'selected' | 'all', initialStatus: TaskStatus | '' = '') => {
    setBulkScope(scope);
    setDeleteStatus(initialStatus);
    setDeleteFromDate('');
    setDeleteToDate('');
    setRemoveFromDashboard(false);
    setBulkConfirmOpen(true);
  };

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
      header: t('titleColumn'),
      sortable: true,
      sortKey: 'title',
      cell: (t) => (
        <div className="max-w-[280px]">
          <p className="truncate font-medium">{t.title}</p>
          {t.description && <p className="truncate text-xs text-muted-foreground">{t.description}</p>}
          {t.planTask?.plan && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <BookOpen className="h-3.5 w-3.5" />
              {t.planTask.plan.title}
            </span>
          )}
        </div>
      ),
    },
    { key: 'status', header: t('statusColumn'), cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'priority', header: t('priorityColumn'), cell: (t) => <PriorityBadge priority={t.priority} /> },
    ...(isAdmin
      ? [
          {
            key: 'assignee',
            header: t('assigneeColumn'),
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
      header: t('dueColumn'),
      sortable: true,
      sortKey: 'dueDate',
      cell: (task) => {
        const days = remainingDays(task.dueDate);
        return (
          <div className="whitespace-nowrap">
            <p>{formatDate(task.dueDate)}</p>
            {days !== null && task.status !== 'COMPLETED' && task.status !== 'PUBLISHED' && (
              <p className={cn('text-xs', days < 0 ? 'text-destructive' : days <= 1 ? 'text-amber-500' : 'text-muted-foreground')}>
                {days < 0
                  ? t('daysOverdue', { days: Math.abs(days) })
                  : days === 0
                    ? t('dueToday')
                    : t('daysLeft', { days })}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: t('progressColumn'),
      cell: (t) => (
        <div className="flex w-28 items-center gap-2">
          <Progress value={t.progress} className="h-1.5" />
          <span className="text-xs text-muted-foreground">{t.progress}%</span>
        </div>
      ),
    },
    ...(isModeratorOrAdmin
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-24',
            cell: (task: Task) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {(task.requiresPublishing || task.status === 'WAITING_FOR_PUBLISHING') && task.status !== 'PUBLISHED' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    title={tCommon('publish') || 'Publish'}
                    disabled={taskAction.isPending}
                    onClick={async () => {
                      try {
                        await taskAction.mutateAsync({ id: task.id, action: 'publish' });
                        toast.success('Task published successfully');
                      } catch (err) {
                        toast.error(errorMessage(err, 'Failed to publish task'));
                      }
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isAdmin && (
                  <>
                    {task.planTask && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        title={t('removeFromPlan')}
                        disabled={removePlanTask.isPending}
                        onClick={async () => {
                          try {
                            await removePlanTask.mutateAsync({
                              planId: task.planTask!.planId,
                              planTaskId: task.planTask!.id,
                            });
                            toast.success(t('removedFromPlan'));
                          } catch (err) {
                            toast.error(errorMessage(err, t('removeFromPlanFailed')));
                          }
                        }}
                      >
                        <Link2Off className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={tCommon('edit')}
                      onClick={() => {
                        setEditTask(task);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      title={task.planTask ? t('deleteTaskAndPlan') : tCommon('delete')}
                      onClick={() => setDeleteTarget(task)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
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
          <h1 className="text-2xl font-bold tracking-tight">{isAdmin ? t('title') : t('myTasks')}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? t('subtitle') : t('myTasksSubtitle')}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedKeys.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => openBulkDelete('selected')}
              >
                <Trash2 className="h-4 w-4" /> {t('deleteSelected', { count: selectedKeys.size })}
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive"
              onClick={() => openBulkDelete('all', 'COMPLETED')}
            >
              <Trash2 className="h-4 w-4" /> {t('deleteCompleted')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => openBulkDelete('all')}
            >
              <Trash2 className="h-4 w-4" /> {t('deleteAllTasks')}
            </Button>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setArchiveConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> {t('clearDashboardArchive')}
            </Button>
            <Button
              onClick={() => {
                setEditTask(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t('newTask')}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
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
          <option value="">{t('allStatuses')}</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tb((s === 'IN_PROGRESS' ? 'inProgress' : s.toLowerCase()) as string)}
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
          <option value="">{t('allPriorities')}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {tb(p.toLowerCase() as string)}
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
            <option value="">{t('allAssignees')}</option>
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
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDescription')}
        onRowClick={(t) => router.push(`/tasks/${t.id}`)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        selectable={isAdmin}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
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
        title={t('deleteTitle')}
        description={
          deleteTarget?.planTask
            ? t('deleteTaskAndPlanDescription', { title: deleteTarget.title })
            : t('deleteDescription', { title: deleteTarget?.title ?? '' })
        }
        confirmLabel={t('deleteConfirm')}
        destructive
        loading={deleteTask.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteTask.mutateAsync(deleteTarget.id);
            toast.success(t('deleteConfirm'));
            setDeleteTarget(null);
          } catch (err) {
            toast.error(errorMessage(err, 'Failed to delete task'));
          }
        }}
      />

      <Dialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={t('bulkDeleteTitle')}
        description={deleteSummary}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="delete-scope">{t('deleteScope')}</Label>
            <Select
              id="delete-scope"
              value={bulkScope}
              onChange={(event) => setBulkScope(event.target.value as 'selected' | 'all')}
            >
              <option value="selected" disabled={selectedKeys.size === 0}>
                {t('selectedTasks', { count: selectedKeys.size })}
              </option>
              <option value="all">{t('allTasks')}</option>
            </Select>
          </div>

          {bulkScope === 'all' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="delete-status">{t('deleteStatus')}</Label>
                <Select
                  id="delete-status"
                  value={deleteStatus}
                  onChange={(event) => setDeleteStatus(event.target.value as TaskStatus | '')}
                >
                  <option value="">{t('allStatuses')}</option>
                  {TASK_STATUSES.map((taskStatus) => {
                    const key = taskStatus === 'IN_PROGRESS'
                      ? 'inProgress'
                      : taskStatus === 'WAITING_FOR_PUBLISHING'
                        ? 'waitingForPublishing'
                        : taskStatus.toLowerCase();
                    return <option key={taskStatus} value={taskStatus}>{tb(key)}</option>;
                  })}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('deletePeriod')}</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="delete-from-date" className="mb-1 block text-xs text-muted-foreground">
                      {t('fromDate')}
                    </Label>
                    <Input id="delete-from-date" type="date" value={deleteFromDate} onChange={(event) => setDeleteFromDate(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="delete-to-date" className="mb-1 block text-xs text-muted-foreground">
                      {t('toDate')}
                    </Label>
                    <Input id="delete-to-date" type="date" value={deleteToDate} onChange={(event) => setDeleteToDate(event.target.value)} />
                  </div>
                </div>
                {!deleteFromDate && !deleteToDate && (
                  <p className="text-xs text-muted-foreground">{t('allPeriods')}</p>
                )}
                {isDeleteRangeInvalid && <p className="text-xs text-destructive">{t('invalidDeletePeriod')}</p>}
              </div>
            </>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={removeFromDashboard}
              onChange={(event) => setRemoveFromDashboard(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">{t('removeFromDashboard')}</span>
              <span className="block text-xs text-muted-foreground">{t('removeFromDashboardDescription')}</span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)}>{tCommon('cancel')}</Button>
            <Button
              variant="destructive"
              disabled={bulkDelete.isPending || isDeleteRangeInvalid || (bulkScope === 'selected' && selectedKeys.size === 0)}
              onClick={async () => {
          try {
            const result = await bulkDelete.mutateAsync(
              bulkScope === 'selected'
                ? { ids: Array.from(selectedKeys), removeFromDashboard }
                : {
                    all: true,
                    status: deleteStatus || undefined,
                    fromDate: deleteFromDate || undefined,
                    toDate: deleteToDate || undefined,
                    removeFromDashboard,
                  },
            );
            toast.success(t('bulkDeleteSuccess', { count: result.deletedCount }));
            setSelectedKeys(new Set());
            setBulkConfirmOpen(false);
          } catch (err) {
            toast.error(errorMessage(err, t('bulkDeleteFailed')));
          }
              }}
            >
              {bulkDelete.isPending ? tCommon('loading') : t('deleteTasks')}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={t('clearDashboardArchiveTitle')}
        description={t('clearDashboardArchiveDescription')}
        confirmLabel={t('clearDashboardArchive')}
        destructive
        loading={clearDashboardArchive.isPending}
        onConfirm={async () => {
          try {
            const result = await clearDashboardArchive.mutateAsync();
            toast.success(t('clearDashboardArchiveSuccess', { count: result.deletedCount }));
            setArchiveConfirmOpen(false);
          } catch (err) {
            toast.error(errorMessage(err, t('clearDashboardArchiveFailed')));
          }
        }}
      />
    </motion.div>
  );
}
