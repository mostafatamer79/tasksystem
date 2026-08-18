'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { format, isToday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskDetailSheet } from './task-detail-sheet';
import type { PlanTask, Task } from '@/lib/types';

const STATUS_DOT: Record<string, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  TESTING: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  RETURNED: 'bg-rose-500',
  PUBLISHED: 'bg-purple-500',
};

const MAX_VISIBLE = 3;

interface CalendarDayCellProps {
  day: Date;
  tasks: PlanTask[];
  isCurrentMonth: boolean;
  canEdit: boolean;
  onAddTask: (date: Date) => void;
}

export function CalendarDayCell({
  day,
  tasks,
  isCurrentMonth,
  canEdit,
  onAddTask,
}: CalendarDayCellProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPlanTask, setSelectedPlanTask] = useState<PlanTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;

  const todayCell = isToday(day);
  const overflow = tasks.length > MAX_VISIBLE;
  const visibleTasks = expanded ? tasks : tasks.slice(0, MAX_VISIBLE);
  const hiddenCount = tasks.length - MAX_VISIBLE;

  const handleTaskClick = (e: React.MouseEvent, planTask: PlanTask) => {
    e.stopPropagation();
    setSelectedPlanTask(planTask);
    setSheetOpen(true);
  };

  const handleCellClick = () => {
    if (canEdit && isCurrentMonth) {
      onAddTask(day);
    }
  };

  return (
    <>
      <div
        onClick={handleCellClick}
        className={cn(
          'relative flex min-h-[120px] flex-col p-2 transition-colors z-0 group select-none',
          isCurrentMonth ? 'bg-card text-foreground' : 'bg-muted/10 text-muted-foreground/40',
          canEdit && isCurrentMonth && 'cursor-pointer hover:bg-accent/40',
          !canEdit && isCurrentMonth && 'cursor-default',
          todayCell && 'bg-primary/5'
        )}
      >
        {/* Day header (name + date number) */}
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {format(day, 'EEE', { locale: dateLocale })}
            </span>
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold tracking-tight transition-colors',
                todayCell
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : isCurrentMonth
                  ? 'text-foreground/90'
                  : 'text-muted-foreground/30'
              )}
            >
              {format(day, 'd')}
            </span>
          </div>

          {/* Quick add hint icon */}
          {canEdit && isCurrentMonth && (
            <span className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-4 w-4 rounded bg-primary/10 text-primary transition-opacity">
              <Plus className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Task list inside cell */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {visibleTasks.map((planTask) => {
            const linked = planTask.task as Task | undefined;
            const status = linked?.status ?? 'TODO';
            return (
              <button
                key={planTask.id}
                onClick={(e) => handleTaskClick(e, planTask)}
                className="w-full text-left rounded-md border border-border/60 bg-background/90 px-2 py-1 transition-all hover:border-primary/40 hover:bg-background hover:shadow-xs group/item cursor-pointer"
                title={linked?.title || planTask.title}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      STATUS_DOT[status] ?? 'bg-slate-400'
                    )}
                  />
                  <span className="truncate text-[11px] font-medium leading-tight text-foreground/90 group-hover/item:text-primary transition-colors">
                    {linked?.title || planTask.title}
                  </span>
                </div>
                {linked?.assignedTo && (
                  <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/80 pl-3 truncate">
                    <span>{linked.assignedTo.name}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Overflow +N more */}
          {overflow && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors w-fit mt-0.5 cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>+{hiddenCount} more</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Task detail sheet */}
      <TaskDetailSheet
        planTask={selectedPlanTask}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
