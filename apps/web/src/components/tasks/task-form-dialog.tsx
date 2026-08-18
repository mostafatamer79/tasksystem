'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Sparkles,
  FileText,
  Flag,
  Calendar as CalendarIcon,
  UserCheck,
  Users,
  Clock,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { createTaskSchema, type CreateTaskInput } from '@/lib/schemas';
import { useCreateTask, useUpdateTask, useEmployees, errorMessage } from '@/lib/hooks';
import { PRIORITIES, type Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null; // when set → edit mode
  onSuccess?: (task: Task) => void;
  initialTitle?: string;
  initialDueDate?: string;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
  initialTitle,
  initialDueDate,
}: TaskFormDialogProps) {
  const t = useTranslations('TaskForm');
  const tb = useTranslations('Badges');
  const isEdit = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask(task?.id ?? '');
  const employees = useEmployees(open);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: 'MEDIUM', assignmentMode: 'MANUAL' },
  });

  const assignmentMode = watch('assignmentMode');

  useEffect(() => {
    if (open && task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assignmentMode: task.assignmentMode,
        assignedToId: task.assignedToId,
        attachmentLink: task.attachmentLink ?? '',
        estimatedHours: task.estimatedHours ?? undefined,
      });
    } else if (open) {
      reset({
        title: initialTitle ?? '',
        description: '',
        priority: 'MEDIUM',
        dueDate: initialDueDate ?? '',
        assignmentMode: 'MANUAL',
        assignedToId: '',
        attachmentLink: '',
        estimatedHours: undefined,
      });
    }
  }, [open, task, reset, initialTitle, initialDueDate]);

  const onSubmit = async (values: CreateTaskInput) => {
    const payload = {
      ...values,
      assignedToId: values.assignmentMode === 'BALANCED' ? undefined : values.assignedToId || undefined,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      attachmentLink: values.attachmentLink || undefined,
      description: values.description || undefined,
      estimatedHours: values.estimatedHours === undefined ? undefined : Number(values.estimatedHours),
    };
    try {
      if (isEdit) {
        const { assignmentMode: _mode, ...updatePayload } = payload;
        const result = await updateTask.mutateAsync(updatePayload);
        toast.success(t('save'));
        onSuccess?.(result);
      } else {
        const result = await createTask.mutateAsync(payload);
        toast.success(
          values.assignmentMode === 'BALANCED' ? 'Task created & auto-balanced ✨' : t('create'),
        );
        onSuccess?.(result);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save task'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-2xl p-0 overflow-hidden rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl"
    >
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEdit ? t('editTitle') : t('createTitle')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? t('editDescription') : t('createDescription')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5" noValidate>
        {/* Task Title & Description Group */}
        <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <Label htmlFor="tf-title">{t('titleLabel')}</Label>
            </div>
            <Input
              id="tf-title"
              placeholder={t('titlePlaceholder')}
              className="h-11 rounded-xl bg-background border-border/70"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tf-desc" className="text-xs font-semibold text-foreground/80">
              {t('descriptionLabel')}
            </Label>
            <Textarea
              id="tf-desc"
              rows={3}
              placeholder={t('descriptionPlaceholder')}
              className="rounded-xl bg-background border-border/70"
              {...register('description')}
            />
          </div>
        </div>

        {/* Priority & Due Date */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
              <Flag className="h-3.5 w-3.5 text-orange-500" />
              <Label htmlFor="tf-priority">{t('priorityLabel')}</Label>
            </div>
            <Select id="tf-priority" className="h-11 rounded-xl bg-background" {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {tb(p.toLowerCase() as string)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
              <Label htmlFor="tf-due">{t('dueDateLabel')}</Label>
            </div>
            <Input id="tf-due" type="date" className="h-11 rounded-xl bg-background" {...register('dueDate')} />
          </div>
        </div>

        {/* Assignment Mode */}
        {!isEdit && (
          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
              <Label>{t('assignmentModeLabel')}</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['MANUAL', 'BALANCED'] as const).map((mode) => (
                <label
                  key={mode}
                  className={cn(
                    'relative flex cursor-pointer flex-col rounded-xl border p-3.5 text-sm transition-all',
                    assignmentMode === mode
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                      : 'bg-background hover:bg-muted/50 border-border/70'
                  )}
                >
                  <input type="radio" value={mode} className="sr-only" {...register('assignmentMode')} />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">
                      {mode === 'MANUAL' ? t('manualMode') : t('balancedMode')}
                    </span>
                    {assignmentMode === mode && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {mode === 'MANUAL' ? t('manualModeDescription') : t('balancedModeDescription')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Assignee selection */}
        {(isEdit || assignmentMode === 'MANUAL') && (
          <div className="space-y-1.5 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
              <Users className="h-3.5 w-3.5 text-purple-500" />
              <Label htmlFor="tf-assignee">{t('assigneeLabel')}</Label>
            </div>
            <Select id="tf-assignee" className="h-11 rounded-xl bg-background" {...register('assignedToId')}>
              <option value="">{t('assigneePlaceholder')}</option>
              {(employees.data?.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.position ? `— ${u.position}` : ''}
                </option>
              ))}
            </Select>
            {errors.assignedToId && <p className="text-xs text-destructive">{errors.assignedToId.message}</p>}
          </div>
        )}

        {/* Hours & Attachment */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <Label htmlFor="tf-hours">{t('estimatedHoursLabel')}</Label>
            </div>
            <Input
              id="tf-hours"
              type="number"
              min={0}
              step="0.5"
              className="h-11 rounded-xl bg-background"
              {...register('estimatedHours', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
            />
          </div>

          <div className="space-y-1.5 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
              <Link2 className="h-3.5 w-3.5 text-teal-500" />
              <Label htmlFor="tf-attach">{t('attachmentLinkLabel')}</Label>
            </div>
            <Input
              id="tf-attach"
              type="url"
              placeholder={t('attachmentLinkPlaceholder')}
              className="h-11 rounded-xl bg-background"
              {...register('attachmentLink')}
            />
            {errors.attachmentLink && (
              <p className="text-xs text-destructive">{errors.attachmentLink.message}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl px-5"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            className="rounded-xl px-7 gap-2 shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isEdit ? t('save') : t('create')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
