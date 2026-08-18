'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  ArrowLeft,
  CalendarDays,
  Save,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { usePlan, useUpdatePlan, useDeletePlan, usePlanAction, useBulkUpsertPlanTasks } from '@/lib/hooks';
import type { Task } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { PlanCalendar } from '@/components/plans/plan-calendar';
import { AssignedTasksList } from '@/components/plans/assigned-tasks-list';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  SUBMITTED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  RETURNED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Plans');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const isAdminOrModerator = isAdmin || isModerator;

  const { data: plan, isLoading, error } = usePlan(id);
  const { mutateAsync: updatePlan, isPending: isUpdating } = useUpdatePlan(id);
  const { mutateAsync: deletePlan, isPending: isDeleting } = useDeletePlan();
  const { mutateAsync: planAction, isPending: isActioning } = usePlanAction();
  const { mutateAsync: upsertTasks, isPending: isSavingTasks } = useBulkUpsertPlanTasks(id);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [description, setDescription] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Local state for tasks (mirrors plan.tasks from server)
  const [tasks, setTasks] = useState<import('@/lib/types').PlanTask[]>([]);

  useEffect(() => {
    if (plan) {
      setTitle(plan.title || '');
      setTeacherName(plan.teacherName || '');
      setDescription(plan.description || '');
      setPeriodStart(plan.periodStart ? new Date(plan.periodStart).toISOString().split('T')[0] : '');
      setPeriodEnd(plan.periodEnd ? new Date(plan.periodEnd).toISOString().split('T')[0] : '');
      const sorted = [...(plan.tasks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setTasks(sorted);
    }
  }, [plan]);

  // ---------- Loading / Error ----------
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 pb-24">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold">{tCommon('error')}</h2>
        <Button onClick={() => router.push('/plans')} variant="outline">
          {tCommon('cancel')}
        </Button>
      </div>
    );
  }

  const canEdit =
    (isAdmin || user?.role === 'EMPLOYEE' || isModerator) &&
    (plan.status === 'DRAFT' || plan.status === 'RETURNED');

  const completedCount = tasks.filter((t) => (t.task as Task)?.status === 'COMPLETED').length;
  const totalCount = tasks.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  // ---------- Handlers ----------
  const handleSaveInfo = async () => {
    try {
      await updatePlan({
        title,
        teacherName,
        description,
        periodStart: periodStart ? new Date(periodStart).toISOString() : null,
        periodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTasks = async () => {
    try {
      const payload = tasks.map((t, idx) => ({
        id: t.id?.startsWith('temp-') ? undefined : t.id,
        date: new Date(t.date).toISOString(),
        dayName: t.dayName ?? undefined,
        title: t.title,
        content: t.content ?? undefined,
        material: t.material ?? undefined,
        notes: t.notes ?? undefined,
        isReady: t.isReady || false,
        sortOrder: idx,
      }));
      await upsertTasks(payload);
    } catch (err) {
      console.error(err);
    }
  };

  const removeTask = (index: number) => {
    setTasks((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleAddTaskOnDate = (date: Date) => {
    setSelectedDate(date);
    setIsTaskFormOpen(true);
  };

  const handleTaskSuccess = async (task: Task) => {
    setIsTaskFormOpen(false);
    const newPlanTask: import('@/lib/types').PlanTask = {
      id: `temp-${Date.now()}`,
      planId: id,
      sortOrder: tasks.length,
      date: new Date(task.dueDate!).toISOString(),
      dayName: null,
      title: task.title,
      content: null,
      material: null,
      notes: null,
      isReady: false,
      taskId: task.id,
      task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newTasks = [...tasks, newPlanTask];
    setTasks(newTasks);
    try {
      await upsertTasks(
        newTasks.map((t, idx) => ({
          id: t.id?.startsWith('temp-') ? undefined : t.id,
          date: new Date(t.date).toISOString(),
          title: t.title,
          taskId: t.taskId ?? undefined,
          sortOrder: idx,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ---------- Render ----------
  return (
    <div className="w-full space-y-6 pb-24">
      {/* Back button */}
      <Button
        variant="ghost"
        className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push('/plans')}
      >
        <ArrowLeft className="h-4 w-4" />
        {tCommon('cancel')}
      </Button>

      {/* ── Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 dark:border-white/5 bg-background/60 p-6 shadow-sm backdrop-blur-md"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {/* Left: info */}
          <div className="flex-1 space-y-4">
            {/* Status + return note */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                  STATUS_COLORS[plan.status]
                )}
              >
                {t(plan.status.toLowerCase() as Parameters<typeof t>[0])}
              </span>
              {plan.status === 'RETURNED' && plan.returnNote && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {plan.returnNote}
                </span>
              )}
            </div>

            {/* Edit form or view */}
            {isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('planTitle')}</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('teacherName')}</label>
                  <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('periodStart')}</label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('periodEnd')}</label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('description')}</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
                <p className="mt-1 text-base text-muted-foreground">{plan.teacherName}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {plan.periodStart
                        ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', { dateStyle: 'medium' }).format(new Date(plan.periodStart))
                        : '—'}
                      {' → '}
                      {plan.periodEnd
                        ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', { dateStyle: 'medium' }).format(new Date(plan.periodEnd))
                        : '—'}
                    </span>
                  </div>
                </div>
                {plan.description && (
                  <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/40 p-4 text-sm leading-relaxed">
                    {plan.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && !isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                {tCommon('edit')}
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleSaveInfo} disabled={isUpdating} size="sm">
                  {tCommon('save')}
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9"
                disabled={isDeleting}
                onClick={async () => {
                  if (confirm(t('confirmDelete'))) {
                    await deletePlan(id);
                    router.push('/plans');
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                className="gap-2"
                disabled={isActioning}
                onClick={() => {
                  if (completedCount < totalCount && totalCount > 0) {
                    if (!confirm('Not all tasks are complete. Force submit for review?')) return;
                  }
                  planAction({ id, action: 'submit' });
                }}
              >
                <Send className="h-4 w-4" />
                {t('submitForReview')}
              </Button>
            )}
            {isAdminOrModerator && plan.status === 'SUBMITTED' && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isActioning}
                onClick={() => {
                  const note = prompt(t('returnNote') || 'Reason for return:');
                  if (note !== null) planAction({ id, action: 'return', note });
                }}
              >
                {t('returnPlan')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Tasks section ── */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{t('tasks')}</h2>
          <div className="flex items-center gap-3">
            {/* Progress badge */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm transition-colors',
                allComplete
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border bg-card text-foreground'
              )}
            >
              <CheckCircle2 className={cn('h-4 w-4', allComplete ? 'text-emerald-500' : 'text-muted-foreground')} />
              <span>
                {completedCount} / {totalCount}
              </span>
              <span className="text-xs font-normal text-muted-foreground">{tCommon('completed', { defaultValue: 'completed' })}</span>
            </div>
            {canEdit && (
              <Button onClick={handleSaveTasks} disabled={isSavingTasks} size="sm" variant="outline" className="gap-2">
                <Save className="h-3.5 w-3.5" />
                {tCommon('save')}
              </Button>
            )}
          </div>
        </div>

        {/* Calendar + sidebar */}
        <div className="grid gap-6 xl:grid-cols-[1fr_480px] 2xl:grid-cols-[1fr_560px]">
          {/* Calendar */}
          <PlanCalendar
            tasks={tasks}
            isLoading={false}
            canEdit={canEdit}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onAddTask={handleAddTaskOnDate}
          />

          {/* Assigned tasks sidebar */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('assignedTasks')}
            </h3>
            <AssignedTasksList
              tasks={tasks}
              canEdit={canEdit}
              currentMonth={currentMonth}
              onRemove={removeTask}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {/* Task form dialog */}
      <TaskFormDialog
        open={isTaskFormOpen}
        onOpenChange={setIsTaskFormOpen}
        initialTitle=""
        initialDueDate={
          selectedDate
            ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000)
                .toISOString()
                .split('T')[0]
            : ''
        }
        onSuccess={handleTaskSuccess}
      />
    </div>
  );
}
