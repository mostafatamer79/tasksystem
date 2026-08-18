'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Paperclip,
  Pencil,
  Play,
  RotateCcw,
  Send,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import {
  useTask,
  useTaskHistory,
  useTaskComments,
  useTaskAction,
  useAddComment,
  errorMessage,
} from '@/lib/hooks';
import { StatusBadge, PriorityBadge, statusAccent } from '@/components/shared/badges';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { Timeline } from '@/components/shared/timeline';
import { formatDate, formatDateTime, remainingDays, cn } from '@/lib/utils';

const commentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(1000),
});
const returnSchema = z.object({
  note: z.string().min(1, 'Reason required').max(500),
});

export default function TaskDetailPage() {
  const t = useTranslations('TaskDetail');
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const task = useTask(id);
  const history = useTaskHistory(id);
  const comments = useTaskComments(id);
  const taskAction = useTaskAction();
  const addComment = useAddComment(id);

  const [editOpen, setEditOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [progressDraft, setProgressDraft] = useState<number | null>(null);

  const commentForm = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  });
  const returnForm = useForm({
    resolver: zodResolver(returnSchema),
    defaultValues: { note: '' },
  });

  if (task.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (task.isError || !task.data) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-lg font-semibold">{t('notFound')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push('/tasks')}>
          <ArrowLeft className="h-4 w-4" /> {t('backToTasks')}
        </Button>
      </div>
    );
  }

  const tk = task.data;
  const days = remainingDays(tk.dueDate);
  const isAssignee = user?.id === tk.assignedToId;
  const isModeratorOrAdmin = isAdmin || user?.role === 'MODERATOR';
  const canProgress = isAssignee && tk.status === 'IN_PROGRESS';
  const hasActions =
    (isAssignee && (tk.status === 'TODO' || tk.status === 'RETURNED' || tk.status === 'IN_PROGRESS')) ||
    (isModeratorOrAdmin && (tk.status === 'TESTING' || tk.status === 'COMPLETED'));

  const runAction = async (action: 'start' | 'submit-testing' | 'approve' | 'publish', successKey: string) => {
    try {
      await taskAction.mutateAsync({ id: tk.id, action });
      toast.success(t(successKey as string));
    } catch (err) {
      toast.error(errorMessage(err, 'Action not allowed'));
    }
  };

  const actionButtonsNode = (
    <div className="flex flex-wrap items-center gap-2">
      {isAssignee && (tk.status === 'TODO' || tk.status === 'RETURNED') && (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          onClick={() => runAction('start', 'workStarted')}
          disabled={taskAction.isPending}
        >
          <Play className="h-3.5 w-3.5" /> {t('startWork')}
        </Button>
      )}
      {isAssignee && tk.status === 'IN_PROGRESS' && (
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          onClick={() => runAction('submit-testing', 'submittedForTesting')}
          disabled={taskAction.isPending}
        >
          <FlaskConical className="h-3.5 w-3.5" /> {t('submitForTesting')}
        </Button>
      )}
      {isModeratorOrAdmin && (tk.status === 'TESTING' || tk.status === 'COMPLETED') && (
        <>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
            onClick={() => runAction(tk.status === 'COMPLETED' ? 'publish' : 'approve', 'taskApproved')}
            disabled={taskAction.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {tk.status === 'COMPLETED' ? (t('publishTask') || 'Publish Task') : t('approve')}
          </Button>
          {tk.status === 'TESTING' && (
            <Button
              size="sm"
              variant="destructive"
              className="rounded-xl gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
              onClick={() => setReturnOpen(true)}
              disabled={taskAction.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t('returnForRework')}
            </Button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-card shadow-soft"
      >
        <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', statusAccent[tk.status])} />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="glass flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-xl cursor-pointer" title={t('backToTasks')} onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={tk.status} />
                <PriorityBadge priority={tk.priority} />
                {tk.assignmentMode === 'BALANCED' && (
                  <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                    {t('autoAssigned')}
                  </span>
                )}
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{tk.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasActions && actionButtonsNode}
            {isAdmin && (
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 cursor-pointer" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> {t('edit')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="space-y-5 p-6">
                {tk.description && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {tk.description}
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('progress')}</span>
                    <span className="font-semibold tabular-nums">{progressDraft ?? tk.progress}%</span>
                  </div>
                  <Progress value={progressDraft ?? tk.progress} className="h-2.5" />
                </div>

                {canProgress && (
                  <form
                    className="flex items-end gap-2 rounded-xl border bg-muted/40 p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (progressDraft === null) return;
                      try {
                        await taskAction.mutateAsync({ id: tk.id, action: 'progress', progress: progressDraft });
                        toast.success(t('progressUpdated'));
                        setProgressDraft(null);
                      } catch (err) {
                        toast.error(errorMessage(err, 'Failed to update progress'));
                      }
                    }}
                  >
                    <div className="flex-1 space-y-1">
                      <label htmlFor="progress-input" className="text-xs font-medium text-foreground block mb-1">
                        {t('updateProgressLabel')}
                      </label>
                      <Input
                        id="progress-input"
                        type="number"
                        min={0}
                        max={100}
                        value={progressDraft ?? tk.progress}
                        onChange={(e) => setProgressDraft(Number(e.target.value))}
                        className="rounded-xl"
                      />
                    </div>
                    <Button type="submit" size="sm" className="rounded-xl cursor-pointer" disabled={taskAction.isPending || progressDraft === null}>
                      {t('save')}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Comments */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('commentsCount', { count: comments.data?.length ?? 0 })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  {(comments.data ?? []).map((c, i) => {
                    const mine = c.authorId === user?.id;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.3) }}
                        className={cn('flex gap-3', mine && 'flex-row-reverse')}
                      >
                        <Avatar name={c.author?.name ?? '?'} src={c.author?.avatarUrl} className="h-7 w-7 shrink-0 text-[10px]" />
                        <div className={cn('max-w-[80%]', mine && 'text-right')}>
                          <p className="mb-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{c.author?.name}</span> ·{' '}
                            {formatDateTime(c.createdAt)}
                          </p>
                          <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed', mine ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            {c.body}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <form
                  className="flex gap-2"
                  onSubmit={commentForm.handleSubmit(async (v) => {
                    try {
                      await addComment.mutateAsync(v.body);
                      commentForm.reset();
                    } catch (err) {
                      toast.error(errorMessage(err, 'Failed to add comment'));
                    }
                  })}
                >
                  <Input placeholder={t('commentPlaceholder')} className="rounded-xl" {...commentForm.register('body')} />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl cursor-pointer" title={t('commentPlaceholder')} disabled={addComment.isPending}>
                    {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                {commentForm.formState.errors.body && (
                  <p className="text-xs text-destructive">{commentForm.formState.errors.body.message}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* History timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('activity')}</CardTitle>
              </CardHeader>
              <CardContent>
                {history.isLoading ? <Skeleton className="h-40 w-full" /> : <Timeline entries={history.data ?? []} />}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          {/* Status Controls Card in Sidebar */}
          {hasActions && (
            <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Task Workflow & Status Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isModeratorOrAdmin
                    ? 'Review and manage status transitions for this task.'
                    : 'Update status or progress for your assigned task.'}
                </p>
                {actionButtonsNode}
              </CardContent>
            </Card>
          )}

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('assignee')}</p>
                <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-2.5">
                  {tk.assignedTo && <Avatar name={tk.assignedTo.name} src={tk.assignedTo.avatarUrl} className="h-7 w-7 text-[10px]" />}
                  <span className="font-medium">{tk.assignedTo?.name ?? '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dueDate')}</p>
                  <p className="font-medium">{formatDate(tk.dueDate)}</p>
                  {days !== null && tk.status !== 'COMPLETED' && tk.status !== 'PUBLISHED' && (
                    <p className={cn('text-xs', days < 0 ? 'text-destructive' : days <= 1 ? 'text-amber-500' : 'text-muted-foreground')}>
                      {days < 0
                        ? t('daysOverdue', { days: Math.abs(days) })
                        : days === 0
                          ? t('dueToday')
                          : t('daysLeft', { days })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Timer className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('estimatedActualHours')}</p>
                  <p className="font-medium">
                    {tk.estimatedHours ?? '—'}h / {tk.actualHours ?? '—'}h
                  </p>
                </div>
              </div>

              {tk.attachmentLink && (
                <a
                  href={tk.attachmentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-primary/25 bg-accent/50 p-3 text-sm font-medium text-primary transition-all hover:shadow-glow"
                >
                  <Paperclip className="h-4 w-4" /> {t('viewAttachment')}
                </a>
              )}
              <div className="border-t pt-3 text-xs text-muted-foreground">
                <p>{t('createdBy', { name: tk.createdBy?.name ?? '—' })}</p>
                <p>{formatDateTime(tk.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={tk} />

      <Dialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title={t('returnTitle')}
        description={t('returnDescription')}
      >
        <form
          className="space-y-4"
          onSubmit={returnForm.handleSubmit(async (v) => {
            try {
              await taskAction.mutateAsync({ id: tk.id, action: 'return', note: v.note });
              toast.success(t('taskReturned'));
              setReturnOpen(false);
            } catch (err) {
              toast.error(errorMessage(err, 'Failed to return task'));
            }
          })}
        >
          <div className="space-y-1.5">
            <label htmlFor="return-note" className="text-xs font-medium text-foreground block mb-1">{t('returnReasonLabel')}</label>
            <Textarea id="return-note" placeholder={t('returnReasonPlaceholder')} {...returnForm.register('note')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl cursor-pointer" onClick={() => setReturnOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="destructive" className="rounded-xl cursor-pointer" disabled={taskAction.isPending}>
              {t('returnConfirm')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
