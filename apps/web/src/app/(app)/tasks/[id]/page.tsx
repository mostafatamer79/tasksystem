'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Paperclip,
  CalendarClock,
  Pencil,
  CheckCircle2,
  RotateCcw,
  Play,
  FlaskConical,
  Loader2,
  Timer,
  Send,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import {
  useTask,
  useTaskHistory,
  useTaskComments,
  useTaskAction,
  useAddComment,
  errorMessage,
} from '@/lib/hooks';
import { commentSchema, returnTaskSchema, type CommentInput, type ReturnTaskInput } from '@/lib/schemas';
import { formatDate, formatDateTime, remainingDays, cn } from '@/lib/utils';
import { StatusBadge, PriorityBadge, statusAccent } from '@/components/shared/badges';
import { Timeline } from '@/components/shared/timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';

export default function TaskDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  const commentForm = useForm<CommentInput>({ resolver: zodResolver(commentSchema) });
  const returnForm = useForm<ReturnTaskInput>({ resolver: zodResolver(returnTaskSchema) });

  if (task.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (task.isError || !task.data) {
    return (
      <div className="mx-auto max-w-5xl py-24 text-center">
        <p className="text-lg font-semibold">Task not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or you do not have access.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/tasks')}>
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </Button>
      </div>
    );
  }

  const t = task.data;
  const days = remainingDays(t.dueDate);
  const isAssignee = user?.id === t.assignedToId;
  const canProgress = isAssignee && t.status === 'IN_PROGRESS';
  const hasActions =
    (isAssignee && (t.status === 'TODO' || t.status === 'RETURNED' || t.status === 'IN_PROGRESS')) ||
    (isAdmin && t.status === 'TESTING');

  const runAction = async (action: 'start' | 'submit-testing' | 'approve', success: string) => {
    try {
      await taskAction.mutateAsync({ id: t.id, action });
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err, 'Action not allowed'));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Gradient status banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border shadow-soft"
      >
        <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', statusAccent[t.status])} />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="glass flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                {t.assignmentMode === 'BALANCED' && (
                  <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                    Auto-assigned
                  </span>
                )}
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight">{t.title}</h1>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="space-y-5 p-6">
                {t.description && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold tabular-nums">{progressDraft ?? t.progress}%</span>
                  </div>
                  <Progress value={progressDraft ?? t.progress} className="h-2.5" />
                </div>

                {canProgress && (
                  <form
                    className="flex items-end gap-2 rounded-xl border bg-muted/40 p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (progressDraft === null) return;
                      try {
                        await taskAction.mutateAsync({ id: t.id, action: 'progress', progress: progressDraft });
                        toast.success('Progress updated');
                        setProgressDraft(null);
                      } catch (err) {
                        toast.error(errorMessage(err, 'Failed to update progress'));
                      }
                    }}
                  >
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="progress-input" className="text-xs">
                        Update progress (0–100)
                      </Label>
                      <Input
                        id="progress-input"
                        type="number"
                        min={0}
                        max={100}
                        value={progressDraft ?? t.progress}
                        onChange={(e) => setProgressDraft(Number(e.target.value))}
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={taskAction.isPending || progressDraft === null}>
                      Save
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
                <CardTitle className="text-base">Comments ({comments.data?.length ?? 0})</CardTitle>
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
                          <p
                            className={cn(
                              'inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-left text-sm shadow-sm',
                              mine
                                ? 'rounded-tr-md bg-brand-gradient text-white'
                                : 'rounded-tl-md border bg-muted/60',
                            )}
                          >
                            {c.body}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  {comments.data?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet — start the discussion.</p>
                  )}
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
                  <Input placeholder="Write a comment…" className="rounded-xl" {...commentForm.register('body')} />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" disabled={addComment.isPending}>
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
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {history.isLoading ? <Skeleton className="h-40 w-full" /> : <Timeline entries={history.data ?? []} />}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Assignee</p>
                <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-2.5">
                  {t.assignedTo && <Avatar name={t.assignedTo.name} src={t.assignedTo.avatarUrl} className="h-7 w-7 text-[10px]" />}
                  <span className="font-medium">{t.assignedTo?.name ?? '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due date</p>
                  <p className="font-medium">{formatDate(t.dueDate)}</p>
                  {days !== null && t.status !== 'COMPLETED' && (
                    <p className={cn('text-xs', days < 0 ? 'text-destructive' : days <= 1 ? 'text-amber-500' : 'text-muted-foreground')}>
                      {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days remaining`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Timer className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated / actual hours</p>
                  <p className="font-medium">
                    {t.estimatedHours ?? '—'}h / {t.actualHours ?? '—'}h
                  </p>
                </div>
              </div>
              {t.attachmentLink && (
                <a
                  href={t.attachmentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-primary/25 bg-accent/50 p-3 text-sm font-medium text-primary transition-all hover:shadow-glow"
                >
                  <Paperclip className="h-4 w-4" /> View attachment
                </a>
              )}
              <div className="border-t pt-3 text-xs text-muted-foreground">
                <p>Created by {t.createdBy?.name ?? '—'}</p>
                <p>{formatDateTime(t.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sticky action bar */}
      {hasActions && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 28 }}
          className="glass-strong sticky bottom-4 z-20 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl p-3 shadow-lift"
        >
          {isAssignee && (t.status === 'TODO' || t.status === 'RETURNED') && (
            <Button onClick={() => runAction('start', 'Work started')} disabled={taskAction.isPending}>
              <Play className="h-4 w-4" /> Start work
            </Button>
          )}
          {isAssignee && t.status === 'IN_PROGRESS' && (
            <Button onClick={() => runAction('submit-testing', 'Submitted for testing')} disabled={taskAction.isPending}>
              <FlaskConical className="h-4 w-4" /> Submit for testing
            </Button>
          )}
          {isAdmin && t.status === 'TESTING' && (
            <>
              <Button onClick={() => runAction('approve', 'Task approved')} disabled={taskAction.isPending}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="h-4 w-4" /> Return for rework
              </Button>
            </>
          )}
        </motion.div>
      )}

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={t} />

      <Dialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return task for rework"
        description="The task moves back to Returned and the assignee is notified."
      >
        <form
          className="space-y-4"
          onSubmit={returnForm.handleSubmit(async (v) => {
            try {
              await taskAction.mutateAsync({ id: t.id, action: 'return', note: v.note });
              toast.success('Task returned');
              setReturnOpen(false);
            } catch (err) {
              toast.error(errorMessage(err, 'Failed to return task'));
            }
          })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="return-note">Reason (optional)</Label>
            <Textarea id="return-note" placeholder="What needs to change?" {...returnForm.register('note')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={taskAction.isPending}>
              Return task
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
