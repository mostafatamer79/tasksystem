'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
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
  Workflow,
  GitBranch,
  Plus,
  Trash2,
  PlayCircle,
  Eye,
  LayoutList,
  Bot,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { STATUS_CONFIG, PriorityBadge } from '@/components/plans/task-status-badge';
import { createTaskSchema, type CreateTaskInput } from '@/lib/schemas';
import { useCreateTask, useUpdateTask, useEmployees, useWorkflowTemplates, errorMessage } from '@/lib/hooks';
import { PRIORITIES, type Task, type NextTaskDefinition, type WorkflowTemplate, type Role, type TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSuccess?: (task: Task) => void;
  initialTitle?: string;
  initialDueDate?: string;
}

const TRIGGER_STATUSES = ['COMPLETED', 'TESTING', 'PUBLISHED'] as const;

function scalarToNextTasks(task?: Task): NextTaskDefinition[] | undefined {
  if (!task) return undefined;
  if (task.nextTasks && task.nextTasks.length > 0) return task.nextTasks;
  if (task.nextTaskTitle) {
    return [
      {
        title: task.nextTaskTitle,
        description: task.nextTaskDescription || undefined,
        assigneeRole: (task.nextTaskAssigneeRole as Role) || undefined,
        assigneeId: task.nextTaskAssigneeId || undefined,
        dueDays: task.nextTaskDueDays || undefined,
        priority: task.nextTaskPriority || undefined,
        requiresPublishing: task.requiresPublishing || undefined,
        condition: 'ON_SUCCESS',
      },
    ];
  }
  return undefined;
}

function assigneeLabel(
  nt: NextTaskDefinition,
  employees: { id: string; name: string; role: string }[],
  tw: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (nt.assigneeId) {
    return employees.find((e) => e.id === nt.assigneeId)?.name || tw('specificUserOption');
  }
  if (nt.assigneeRole) {
    return tw('autoAssignRole', { role: nt.assigneeRole.toLowerCase() });
  }
  return tw('autoAssignCreator');
}

function FlowTimelinePreview({
  triggerStatus,
  nextTasks,
  employees,
  tw,
}: {
  triggerStatus: string;
  nextTasks: NextTaskDefinition[];
  employees: { id: string; name: string; role: string }[];
  tw: (key: string, values?: Record<string, string | number>) => string;
}) {
  const items = [
    { title: tw('previewTrigger', { status: triggerStatus }), subtitle: '', status: triggerStatus as TaskStatus, priority: undefined, requiresPublishing: false },
    ...nextTasks.map((nt) => ({
      title: nt.title || tw('untitledTask'),
      subtitle: `${assigneeLabel(nt, employees, tw)} · ${nt.dueDays ? tw('dueInDaysCount', { count: nt.dueDays }) : tw('noDueOffset')}`,
      status: 'TODO' as const,
      priority: nt.priority,
      requiresPublishing: nt.requiresPublishing,
    })),
  ];

  return (
    <div className="relative">
      {/* Vertical connector */}
      <div className="absolute top-3 bottom-3 left-4 w-0.5 rounded-full bg-gradient-to-b from-primary/40 via-border to-border" />

      <div className="space-y-0">
        {items.map((item, index) => {
          const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.TODO;
          const isLast = index === items.length - 1;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={cn('relative flex items-start gap-4', !isLast && 'pb-5')}
            >
              {/* Node */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm" style={{ borderColor: `hsl(var(--primary))` }}>
                <div className={cn('h-2.5 w-2.5 rounded-full', config.dot)} />
              </div>

              {/* Card */}
              <div className={cn(
                'flex-1 rounded-xl border p-3 transition-all',
                index === 0
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card border-border/80'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-semibold text-foreground truncate', index === 0 && 'text-primary')}>
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    {item.priority && (
                      <PriorityBadge priority={item.priority} size="sm" />
                    )}
                    {item.requiresPublishing && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-purple-600 dark:text-purple-400">
                        <ShieldCheck className="h-3 w-3" />
                        {tw('withPublishing')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
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
  const tw = useTranslations('Tasks');
  const tb = useTranslations('Badges');
  const isEdit = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask(task?.id ?? '');
  const employees = useEmployees(open);
  const templates = useWorkflowTemplates(open);
  const [activeTab, setActiveTab] = useState<'details' | 'workflow'>('details');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: 'MEDIUM', assignmentMode: 'MANUAL' },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'nextTasks',
  });

  const assignmentMode = watch('assignmentMode');
  const isAutomated = watch('isAutomated');
  const triggerStatus = watch('triggerStatus');
  const nextTasks = watch('nextTasks');
  const requiresPublishing = watch('requiresPublishing');

  const employeeList = useMemo(
    () => employees.data?.data.map((u) => ({ id: u.id, name: u.name, role: u.role })) ?? [],
    [employees.data],
  );

  useEffect(() => {
    if (open && task) {
      setActiveTab('details');
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assignmentMode: task.assignmentMode,
        assignedToId: task.assignedToId,
        attachmentLink: task.attachmentLink ?? '',
        estimatedHours: task.estimatedHours ?? undefined,
        isAutomated: task.isAutomated,
        triggerStatus: task.triggerStatus || 'COMPLETED',
        requiresPublishing: task.requiresPublishing,
        nextTasks: scalarToNextTasks(task),
      });
    } else if (open) {
      setActiveTab('details');
      reset({
        title: initialTitle ?? '',
        description: '',
        priority: 'MEDIUM',
        dueDate: initialDueDate ?? '',
        assignmentMode: 'MANUAL',
        assignedToId: '',
        attachmentLink: '',
        estimatedHours: undefined,
        isAutomated: false,
        triggerStatus: 'COMPLETED',
        requiresPublishing: false,
        nextTasks: undefined,
      });
    }
  }, [open, task, reset, initialTitle, initialDueDate]);

  // Enforce MODERATOR role for publishing follow-up tasks and clear explicit assignee.
  useEffect(() => {
    nextTasks?.forEach((nt, index) => {
      if (nt?.requiresPublishing) {
        if (nt.assigneeRole !== 'MODERATOR') {
          setValue(`nextTasks.${index}.assigneeRole`, 'MODERATOR');
        }
        if (nt.assigneeId) {
          setValue(`nextTasks.${index}.assigneeId`, '');
        }
      }
    });
  }, [nextTasks, setValue]);

  const applyTemplate = (template: WorkflowTemplate) => {
    setValue('isAutomated', true);
    setValue('triggerStatus', template.triggerStatus);
    setValue('requiresPublishing', template.requiresPublishing);
    setValue('nextTasks', template.nextTasks);
  };

  const onSubmit = async (values: CreateTaskInput) => {
    const isAutomatedFlow = !!values.isAutomated;
    const payload = {
      ...values,
      assignedToId: values.assignmentMode === 'BALANCED' ? undefined : values.assignedToId || undefined,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      attachmentLink: values.attachmentLink || undefined,
      description: values.description || undefined,
      estimatedHours: values.estimatedHours === undefined ? undefined : Number(values.estimatedHours),
      // Strip all workflow configuration when automation is disabled so the task can be created without a flow.
      isAutomated: isAutomatedFlow,
      triggerStatus: isAutomatedFlow ? values.triggerStatus || 'COMPLETED' : undefined,
      requiresPublishing: isAutomatedFlow ? values.requiresPublishing : undefined,
      nextTasks: isAutomatedFlow && values.nextTasks && values.nextTasks.length > 0 ? values.nextTasks : undefined,
    };
    try {
      if (isEdit) {
        const { assignmentMode: _mode, ...updatePayload } = payload;
        const result = await updateTask.mutateAsync(updatePayload);
        toast.success(t('save'));
        onSuccess?.(result);
      } else {
        const result = await createTask.mutateAsync(payload);
        toast.success(values.assignmentMode === 'BALANCED' ? 'Task created & auto-balanced ✨' : t('create'));
        onSuccess?.(result);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save task'));
    }
  };

  const workflowEnabled = isAutomated;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-xl p-0 overflow-hidden rounded-xl border border-white/10 dark:border-white/5 shadow-2xl"
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              {activeTab === 'workflow' ? <Workflow className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {isEdit ? t('editTitle') : t('createTitle')}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {activeTab === 'workflow' ? tw('workflowAutomation') : (isEdit ? t('editDescription') : t('createDescription'))}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-background/80 p-0.5 border border-border/60 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                activeTab === 'details'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <LayoutList className="h-3 w-3" />
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('workflow')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                activeTab === 'workflow'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Workflow className="h-3 w-3" />
              Workflow
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]" noValidate>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'details' ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <Label htmlFor="tf-title">{t('titleLabel')}</Label>
                  </div>
                  <Input
                    id="tf-title"
                    placeholder={t('titlePlaceholder')}
                    className="h-10 rounded-xl bg-background border-border/70"
                    {...register('title')}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                  <p className="text-[11px] text-muted-foreground">{t('titleHelper')}</p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="tf-desc" className="text-xs font-semibold text-foreground/80">
                    {t('descriptionLabel')}
                  </Label>
                  <Textarea
                    id="tf-desc"
                    rows={4}
                    placeholder={t('descriptionPlaceholder')}
                    className="rounded-xl bg-background border-border/70 resize-none"
                    {...register('description')}
                  />
                  <p className="text-[11px] text-muted-foreground">{t('descriptionHelper')}</p>
                </div>

                {/* Priority & Due Date */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
                      <Flag className="h-3.5 w-3.5 text-orange-500" />
                      <Label htmlFor="tf-priority">{t('priorityLabel')}</Label>
                    </div>
                    <Select id="tf-priority" className="h-10 rounded-xl bg-background" {...register('priority')}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {tb(p.toLowerCase() as string)}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[11px] text-muted-foreground">{t('priorityHelper')}</p>
                  </div>

                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
                      <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                      <Label htmlFor="tf-due">{t('dueDateLabel')}</Label>
                    </div>
                    <Input id="tf-due" type="date" className="h-10 rounded-xl bg-background" {...register('dueDate')} />
                    <p className="text-[11px] text-muted-foreground">{t('dueDateHelper')}</p>
                  </div>
                </div>

                {/* Assignment */}
                {!isEdit && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
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
                            {assignmentMode === mode && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {mode === 'MANUAL' ? t('manualModeDescription') : t('balancedModeDescription')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(isEdit || assignmentMode === 'MANUAL') && (
                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      <Label htmlFor="tf-assignee">{t('assigneeLabel')}</Label>
                    </div>
                    <Select id="tf-assignee" className="h-10 rounded-xl bg-background" {...register('assignedToId')}>
                      <option value="">{t('assigneePlaceholder')}</option>
                      {(employees.data?.data ?? []).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.position ? `— ${u.position}` : ''}
                        </option>
                      ))}
                    </Select>
                    {errors.assignedToId && <p className="text-xs text-destructive">{errors.assignedToId.message}</p>}
                    <p className="text-[11px] text-muted-foreground">{t('assigneeHelper')}</p>
                  </div>
                )}

                {/* Hours & Attachment */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <Label htmlFor="tf-hours">{t('estimatedHoursLabel')}</Label>
                    </div>
                    <Input
                      id="tf-hours"
                      type="number"
                      min={0}
                      step="0.5"
                      className="h-10 rounded-xl bg-background"
                      {...register('estimatedHours', {
                        setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                      })}
                    />
                    <p className="text-[11px] text-muted-foreground">{t('estimatedHoursHelper')}</p>
                  </div>

                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 mb-1">
                      <Link2 className="h-3.5 w-3.5 text-teal-500" />
                      <Label htmlFor="tf-attach">{t('attachmentLinkLabel')}</Label>
                    </div>
                    <Input
                      id="tf-attach"
                      type="url"
                      placeholder={t('attachmentLinkPlaceholder')}
                      className="h-10 rounded-xl bg-background"
                      {...register('attachmentLink')}
                    />
                    {errors.attachmentLink && <p className="text-xs text-destructive">{errors.attachmentLink.message}</p>}
                    <p className="text-[11px] text-muted-foreground">{t('attachmentLinkHelper')}</p>
                  </div>
                </div>

                {/* Quick create call-to-action */}
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{t('createTitle')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('createWithoutWorkflowDesc')}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="gap-2 rounded-xl shadow-md shrink-0"
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
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="workflow"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Enable automation */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{tw('enableAutomatedWorkflow')}</p>
                        <p className="text-xs text-muted-foreground">{tw('enableAutomatedWorkflowDesc')}</p>
                      </div>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        {...register('isAutomated')}
                      />
                      <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                </div>

                {workflowEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Template + Trigger row */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                        <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          {tw('workflowTemplate')}
                        </Label>
                        <Select
                          className="h-10 rounded-xl bg-background"
                          value=""
                          onChange={(e) => {
                            const tpl = templates.data?.find((t) => t.id === e.target.value);
                            if (tpl) applyTemplate(tpl);
                          }}
                        >
                          <option value="">{tw('chooseTemplate')}</option>
                          {(templates.data ?? []).map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name}
                            </option>
                          ))}
                        </Select>
                        <p className="text-[11px] text-muted-foreground">{tw('chooseTemplateDesc')}</p>
                      </div>

                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                        <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                          <PlayCircle className="h-3.5 w-3.5 text-blue-500" />
                          {tw('triggerStatus')}
                        </Label>
                        <Select className="h-10 rounded-xl bg-background" {...register('triggerStatus')}>
                          {TRIGGER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                        <p className="text-[11px] text-muted-foreground">{tw('triggerStatusDesc')}</p>
                      </div>
                    </div>

                    {/* Publishing toggle */}
                    <div className="rounded-lg border bg-card p-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <Megaphone className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">{tw('requiresPublishingTitle')}</p>
                          <p className="text-xs text-muted-foreground">{tw('requiresPublishingDesc')}</p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            {...register('requiresPublishing')}
                          />
                          <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-purple-600" />
                          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                        </div>
                      </label>
                      {requiresPublishing && (
                        <p className="mt-3 text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {tw('publishRequiresModerator')}
                        </p>
                      )}
                    </div>

                    {/* Follow-up tasks builder */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <GitBranch className="h-4 w-4 text-primary" />
                          <span>{tw('followUpTasks', { count: fields.length })}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs rounded-lg"
                          onClick={() =>
                            append({
                              title: '',
                              condition: 'ON_SUCCESS',
                              dueDays: 1,
                              priority: 'MEDIUM',
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {tw('addParallelTask')}
                        </Button>
                      </div>

                      {fields.length === 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            append({
                              title: '',
                              condition: 'ON_SUCCESS',
                              dueDays: 1,
                              priority: 'MEDIUM',
                            })
                          }
                          className="w-full rounded-xl border border-dashed bg-background p-6 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:border-primary/30"
                        >
                          <Plus className="mx-auto mb-2 h-5 w-5 opacity-50" />
                          {tw('noFollowUpTasksYet', { button: tw('addParallelTask') })}
                        </button>
                      )}

                      <div className="space-y-3">
                        {fields.map((field, index) => {
                          const ntRequiresPublishing = watch(`nextTasks.${index}.requiresPublishing`);
                          const ntAssigneeRole = watch(`nextTasks.${index}.assigneeRole`);
                          return (
                            <motion.div
                              key={field.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="rounded-xl border bg-card p-0 shadow-sm overflow-hidden hover:border-primary/20 transition-colors"
                            >
                              {/* Card header */}
                              <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                                    {index + 1}
                                  </span>
                                  <span className="text-xs font-bold text-foreground">{tw('taskIndex', { index: index + 1 })}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Card body */}
                              <div className="p-3 space-y-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-foreground/80">{tw('titleLabel')}</Label>
                                  <Input
                                    placeholder={tw('titlePlaceholderNext')}
                                    className="h-10 rounded-xl"
                                    {...register(`nextTasks.${index}.title`)}
                                  />
                                  {errors.nextTasks?.[index]?.title && (
                                    <p className="text-xs text-destructive">{errors.nextTasks[index]?.title?.message}</p>
                                  )}
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                      <UserCheck className="h-3 w-3 text-muted-foreground" />
                                      {tw('assignToRole')}
                                    </Label>
                                    <Select
                                      className="h-10 rounded-xl"
                                      {...register(`nextTasks.${index}.assigneeRole`, {
                                        onChange: () => setValue(`nextTasks.${index}.assigneeId`, ''),
                                      })}
                                    >
                                      <option value="">{tw('specificUserOption')}</option>
                                      <option value="MODERATOR">{tw('balancedModerator')}</option>
                                      {!ntRequiresPublishing && <option value="EMPLOYEE">{tw('balancedEmployee')}</option>}
                                    </Select>
                                    {ntRequiresPublishing && (
                                      <p className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3" />
                                        {tw('publishRequiresModerator')}
                                      </p>
                                    )}
                                  </div>

                                  {!ntAssigneeRole && !ntRequiresPublishing && (
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        {tw('orSpecificAssignee')}
                                      </Label>
                                      <Select
                                        className="h-10 rounded-xl"
                                        {...register(`nextTasks.${index}.assigneeId`, {
                                          onChange: () => setValue(`nextTasks.${index}.assigneeRole`, undefined),
                                        })}
                                      >
                                        <option value="">{tw('noneOption')}</option>
                                        {(employees.data?.data ?? []).map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name}
                                          </option>
                                        ))}
                                      </Select>
                                    </div>
                                  )}

                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      {tw('dueDaysLabel')}
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-10 rounded-xl"
                                      {...register(`nextTasks.${index}.dueDays`, {
                                        setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                                      })}
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                      <Flag className="h-3 w-3 text-muted-foreground" />
                                      {tw('priorityLabel')}
                                    </Label>
                                    <Select className="h-10 rounded-xl" {...register(`nextTasks.${index}.priority`)}>
                                      {PRIORITIES.map((p) => (
                                        <option key={p} value={p}>
                                          {tb(p.toLowerCase() as string)}
                                        </option>
                                      ))}
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                                      {tw('conditionLabel')}
                                    </Label>
                                    <Select className="h-10 rounded-xl" {...register(`nextTasks.${index}.condition`)}>
                                      <option value="ON_SUCCESS">{tw('onSuccessOption')}</option>
                                      <option value="ON_RETURN">{tw('onReturnOption')}</option>
                                    </Select>
                                  </div>

                                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 transition-colors hover:bg-muted/30">
                                    <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-muted transition-colors">
                                      <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        {...register(`nextTasks.${index}.requiresPublishing`, {
                                          onChange: (e) => {
                                            if (e.target.checked) {
                                              setValue(`nextTasks.${index}.assigneeRole`, 'MODERATOR');
                                              setValue(`nextTasks.${index}.assigneeId`, '');
                                            }
                                          },
                                        })}
                                      />
                                      <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-purple-600" />
                                      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground">{tw('requiresPublishingCheckbox')}</span>
                                  </label>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live preview */}
                    {nextTasks && nextTasks.length > 0 && (
                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{tw('previewLabel')}</p>
                        </div>
                        <FlowTimelinePreview
                          triggerStatus={triggerStatus || 'COMPLETED'}
                          nextTasks={nextTasks}
                          employees={employeeList}
                          tw={tw}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {!workflowEnabled && (
                  <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                    <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">{tw('noFollowUpTasks')}</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">{tw('noFollowUpTasksDesc')}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-2.5 border-t bg-background/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {workflowEnabled && nextTasks && nextTasks.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary font-medium">
                <Workflow className="h-3 w-3" />
                {nextTasks.length} step{nextTasks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
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
        </div>
      </form>
    </Dialog>
  );
}
