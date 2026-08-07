'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
}

export function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
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
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
        assignmentMode: 'MANUAL',
        assignedToId: '',
        attachmentLink: '',
        estimatedHours: undefined,
      });
    }
  }, [open, task, reset]);

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
        await updateTask.mutateAsync(updatePayload);
        toast.success('Task updated');
      } else {
        await createTask.mutateAsync(payload);
        toast.success(
          values.assignmentMode === 'BALANCED' ? 'Task created and auto-assigned' : 'Task created',
        );
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
      title={isEdit ? 'Edit task' : 'Create task'}
      description={isEdit ? 'Update task details' : 'Assign work to your team'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="tf-title">Title</Label>
          <Input id="tf-title" placeholder="What needs to be done?" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tf-desc">Description</Label>
          <Textarea id="tf-desc" placeholder="Details, acceptance criteria…" {...register('description')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tf-priority">Priority</Label>
            <Select id="tf-priority" {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-due">Due date</Label>
            <Input id="tf-due" type="date" {...register('dueDate')} />
          </div>
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Assignment mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['MANUAL', 'BALANCED'] as const).map((mode) => (
                <label
                  key={mode}
                  className={cn(
                    'flex cursor-pointer flex-col rounded-lg border p-3 text-sm transition-colors',
                    assignmentMode === mode ? 'border-primary bg-accent' : 'hover:bg-muted',
                  )}
                >
                  <input type="radio" value={mode} className="sr-only" {...register('assignmentMode')} />
                  <span className="font-medium">{mode === 'MANUAL' ? 'Manual' : 'Balanced'}</span>
                  <span className="text-xs text-muted-foreground">
                    {mode === 'MANUAL' ? 'Pick the assignee yourself' : 'Auto-assign to least busy employee'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(isEdit || assignmentMode === 'MANUAL') && (
          <div className="space-y-1.5">
            <Label htmlFor="tf-assignee">Assignee</Label>
            <Select id="tf-assignee" {...register('assignedToId')}>
              <option value="">Select an employee…</option>
              {(employees.data?.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.position ? `— ${u.position}` : ''}
                </option>
              ))}
            </Select>
            {errors.assignedToId && <p className="text-xs text-destructive">{errors.assignedToId.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tf-hours">Estimated hours</Label>
            <Input id="tf-hours" type="number" min={0} step="0.5" {...register('estimatedHours', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-attach">Attachment link</Label>
            <Input id="tf-attach" type="url" placeholder="https://…" {...register('attachmentLink')} />
            {errors.attachmentLink && (
              <p className="text-xs text-destructive">{errors.attachmentLink.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
