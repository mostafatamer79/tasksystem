'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDayCell } from './calendar-day-cell';
import type { PlanTask } from '@/lib/types';

interface PlanCalendarProps {
  tasks: PlanTask[];
  isLoading?: boolean;
  canEdit: boolean;
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  onAddTask: (date: Date) => void;
}

export function PlanCalendar({
  tasks,
  isLoading = false,
  canEdit,
  currentMonth,
  onMonthChange,
  onAddTask,
}: PlanCalendarProps) {
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Build a map of date-string → PlanTask[] for O(1) lookup
  const tasksByDay = useMemo(() => {
    const map = new Map<string, PlanTask[]>();
    for (const task of tasks) {
      if (!task.date) continue;
      const key = format(new Date(task.date), 'yyyy-MM-dd');
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, task]);
    }
    return map;
  }, [tasks]);

  // Compute the full grid of days for the current month view
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    });
  }, [currentMonth]);

  const monthTaskCount = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.date) return false;
      return isSameMonth(new Date(t.date), currentMonth);
    }).length;
  }, [tasks, currentMonth]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setDirection(dir === 'prev' ? 'right' : 'left');
    const newMonth = dir === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    onMonthChange(newMonth);
  };

  const variants = {
    enter: (dir: 'left' | 'right') => ({
      x: dir === 'left' ? 30 : -30,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 'left' | 'right') => ({
      x: dir === 'left' ? -30 : 30,
      opacity: 0,
    }),
  };

  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  const dayHeaders = locale === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-0 rounded-3xl border border-white/10 dark:border-white/5 bg-background/60 shadow-lg backdrop-blur-md overflow-hidden glass">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {monthTaskCount} {locale === 'ar' ? 'مهام في هذا الشهر' : `task${monthTaskCount !== 1 ? 's' : ''} in this month`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-2xl border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-background cursor-pointer"
            onClick={() => navigateMonth('prev')}
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-semibold px-3 rounded-xl hover:bg-background cursor-pointer"
            onClick={() => {
              setDirection('right');
              onMonthChange(new Date());
            }}
          >
            {locale === 'ar' ? 'اليوم' : 'Today'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-background cursor-pointer"
            onClick={() => navigateMonth('next')}
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
        {dayHeaders.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid with month slide animation */}
      <div className="relative overflow-hidden" style={{ minHeight: 560 }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={format(currentMonth, 'yyyy-MM')}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="grid grid-cols-7 divide-x divide-y border-t border-l border-border/40"
          >
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="min-h-[120px] p-2 bg-card space-y-1.5">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                  </div>
                ))
              : calendarDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasksByDay.get(key) ?? [];
                  const inCurrentMonth = isSameMonth(day, currentMonth);
                  return (
                    <CalendarDayCell
                      key={key}
                      day={day}
                      tasks={dayTasks}
                      isCurrentMonth={inCurrentMonth}
                      canEdit={canEdit}
                      onAddTask={onAddTask}
                    />
                  );
                })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Empty month state */}
      {!isLoading && monthTaskCount === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground border-t border-border/40 bg-muted/10">
          <CalendarDays className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">No tasks scheduled for {format(currentMonth, 'MMMM yyyy')}</p>
          {canEdit && (
            <p className="text-xs text-muted-foreground/60">Click on any day in the grid above to add a task</p>
          )}
        </div>
      )}
    </div>
  );
}
