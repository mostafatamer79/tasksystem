'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getDynamicGreeting } from '@/lib/greetings';
import {
  ListTodo,
  Activity,
  CheckCircle2,
  FlaskConical,
  RotateCcw,
  Users,
  CalendarClock,
  AlarmClock,
  Clock,
  TrendingUp,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Briefcase,
  UserCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import {
  useAdminStats,
  useAdminCharts,
  useAdminEmployeesStats,
  useEmployeeStats,
  useAttendanceToday,
  useCheckIn,
  useCheckOut,
  useStartPause,
  useEndPause,
  errorMessage,
} from '@/lib/hooks';
import { StatCard, StatCardSkeleton, useCountUp } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  ChartCard,
  CompletedPerMonthChart,
  PriorityBarsChart,
  StatusDonutChart,
  TasksPerEmployeeChart,
} from '@/components/shared/charts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EmployeeTaskStats } from '@/lib/types';

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AttendanceWidget() {
  const t = useTranslations('Attendance');
  const user = useAuthStore((s) => s.user);
  const attendance = useAttendanceToday();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const startPause = useStartPause();
  const endPause = useEndPause();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const data = attendance.data;
  const checkedIn = !!data?.checkIn && !data?.checkOut;
  const checkedOut = !!data?.checkOut;
  const activePause = data?.pauses.find((p) => !p.endedAt) ?? null;

  const elapsedSeconds = useMemo(() => {
    if (!data?.checkIn) return 0;
    const now = Date.now();
    const start = new Date(data.checkIn).getTime();
    let paused = data.totalPausedSeconds;
    if (activePause) {
      paused += Math.floor((now - new Date(activePause.startedAt).getTime()) / 1000);
    }
    return Math.max(0, Math.floor((now - start) / 1000) - paused);
  }, [data, activePause]);

  const pausedSeconds = useMemo(() => {
    if (!data) return 0;
    let total = data.totalPausedSeconds;
    if (activePause) {
      total += Math.floor((Date.now() - new Date(activePause.startedAt).getTime()) / 1000);
    }
    return total;
  }, [data, activePause]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err, 'Action failed'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="relative overflow-hidden transition-shadow duration-300 hover:shadow-lift">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className={cn('rounded-xl p-3 text-white shadow-md', checkedOut ? 'bg-slate-500' : activePause ? 'bg-amber-500' : checkedIn ? 'bg-emerald-500' : 'bg-blue-500')}>
            {checkedOut ? <LogOut className="h-6 w-6" /> : activePause ? <Coffee className="h-6 w-6" /> : checkedIn ? <Briefcase className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <p className="font-medium">{t('title')}</p>
            <p className="text-xs text-muted-foreground">
              {data?.checkIn
                ? t('checkedInAt', { time: formatTime(data.checkIn) ?? '' })
                : t('notCheckedIn')}
              {data?.checkOut && ` · ${t('checkedOutAt', { time: formatTime(data.checkOut) ?? '' })}`}
              {' · '}
              {t('workHours')}: {user?.workStartTime} – {user?.workEndTime}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('elapsed')}</p>
                <p className="font-mono font-semibold tabular-nums">{formatDuration(elapsedSeconds)}</p>
              </div>
              {(pausedSeconds > 0 || activePause) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('paused')}</p>
                  <p className="font-mono font-semibold tabular-nums">{formatDuration(pausedSeconds)}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!data?.checkIn && !checkedOut && (
              <Button size="sm" disabled={checkIn.isPending} onClick={() => run(() => checkIn.mutateAsync(), t('checkedIn'))}>
                {checkIn.isPending ? <Clock className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {t('checkIn')}
              </Button>
            )}
            {checkedIn && !activePause && (
              <>
                <Button size="sm" variant="secondary" disabled={startPause.isPending} onClick={() => run(() => startPause.mutateAsync(), t('pauseStarted'))}>
                  {startPause.isPending ? <Clock className="h-4 w-4 animate-spin" /> : <Coffee className="h-4 w-4" />}
                  {t('startPause')}
                </Button>
                <Button size="sm" disabled={checkOut.isPending} onClick={() => run(() => checkOut.mutateAsync(), t('checkedOut'))}>
                  {checkOut.isPending ? <Clock className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {t('checkOut')}
                </Button>
              </>
            )}
            {checkedIn && activePause && (
              <Button size="sm" variant="outline" disabled={endPause.isPending} onClick={() => run(() => endPause.mutateAsync(), t('pauseEnded'))}>
                {endPause.isPending ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {t('endPause')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Tiny animated ring showing completion rate */
function CompletionRing({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-xs font-bold tabular-nums">{pct}%</span>
    </div>
  );
}

function EmployeeTaskCard({ emp, index }: { emp: EmployeeTaskStats; index: number }) {
  const t = useTranslations('Dashboard');
  const total = useCountUp(emp.totalTasks);
  const todo = useCountUp(emp.todoTasks);
  const inProgress = useCountUp(emp.inProgressTasks);
  const testing = useCountUp(emp.testingTasks);
  const completed = useCountUp(emp.completedTasks);
  const returned = useCountUp(emp.returnedTasks);

  const initials = emp.employeeName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const stats = [
    { label: t('todoTasks'), value: todo, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
    { label: t('inProgressTasks'), value: inProgress, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', dot: 'bg-indigo-500' },
    { label: t('inTesting'), value: testing, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
    { label: t('completed'), value: completed, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
    { label: t('returned'), value: returned, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300', dot: 'bg-rose-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="group relative h-full overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lift">
        {/* Corner glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-gradient opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />

        {/* Header: avatar + name + ring */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-md">
              {initials || <UserCircle2 className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{emp.employeeName}</p>
              {(emp.department || emp.position) && (
                <p className="truncate text-xs text-muted-foreground">
                  {emp.position ?? emp.department}
                </p>
              )}
            </div>
          </div>
          <CompletionRing total={emp.totalTasks} completed={emp.completedTasks} />
        </div>

        {/* Total */}
        <div className="mb-3 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className="text-sm font-bold tabular-nums">{total}</span>
          {emp.totalTasks === 0 && (
            <span className="ml-auto text-xs italic text-muted-foreground">{t('noTasksAssigned')}</span>
          )}
        </div>

        {/* Stat badges */}
        <div className="flex flex-wrap gap-1.5">
          {stats.map((s) => (
            <span
              key={s.label}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                s.color,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
              {s.value} {s.label}
            </span>
          ))}
        </div>

        {/* Mini progress bar (completed / total) */}
        {emp.totalTasks > 0 && (
          <div className="mt-3">
            <Progress
              value={Math.round((emp.completedTasks / emp.totalTasks) * 100)}
              className="h-1.5"
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'custom';

function EmployeeTasksStats() {
  const t = useTranslations('Dashboard');
  const [filter, setFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Resolve the date param sent to the API
  const dateParam =
    filter === 'today'
      ? 'today'
      : filter === 'yesterday'
        ? 'yesterday'
        : filter === 'custom' && customDate
          ? customDate
          : undefined;

  const empStats = useAdminEmployeesStats(dateParam);

  const pills: { key: DateFilter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'today', label: t('filterToday') },
    { key: 'yesterday', label: t('filterYesterday') },
    { key: 'custom', label: t('filterCustom') },
  ];

  // Today's date in YYYY-MM-DD for max attribute
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-lift">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: icon + title */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-600 p-2.5 text-white shadow-md">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{t('employeeTasksStats')}</CardTitle>
                <CardDescription>{t('employeeTasksStatsSubtitle')}</CardDescription>
              </div>
            </div>

            {/* Right: filter pills + optional date input */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Pill toggles */}
              <div className="flex items-center gap-1 rounded-xl border bg-muted/50 p-1 backdrop-blur-sm">
                {pills.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      'relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                      filter === key
                        ? 'bg-white text-foreground shadow-sm dark:bg-slate-800'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {filter === key && (
                      <motion.span
                        layoutId="filter-pill"
                        className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-800"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>

              {/* Custom date input — shown only when "custom" is active */}
              {filter === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, x: -8, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 'auto' }}
                  exit={{ opacity: 0, x: -8, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    type="date"
                    value={customDate}
                    max={todayStr}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className={cn(
                      'rounded-lg border bg-background px-3 py-1.5 text-xs font-medium shadow-sm',
                      'text-foreground ring-offset-background transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      'hover:border-ring',
                    )}
                  />
                </motion.div>
              )}

              {/* Active-filter label badge */}
              {dateParam && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                >
                  <CalendarClock className="h-3 w-3" />
                  {filter === 'custom' ? customDate : filter === 'today' ? t('filterToday') : t('filterYesterday')}
                </motion.span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {empStats.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-14 w-14 rounded-full" />
                  </div>
                  <Skeleton className="mb-3 h-4 w-24" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-5 w-20 rounded-full" />)}
                  </div>
                  <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
                </Card>
              ))}
            </div>
          ) : !empStats.data?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">{t('noTasksAssigned')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {empStats.data.map((emp, i) => (
                <EmployeeTaskCard key={emp.employeeId} emp={emp} index={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AdminDashboard() {
  const t = useTranslations('Dashboard');
  const stats = useAdminStats();
  const charts = useAdminCharts();

  const s = stats.data;
  const cards = s
    ? [
        { title: t('totalTasks'), value: s.totalTasks, icon: ListTodo, tone: 'default' as const },
        { title: t('activeTasks'), value: s.activeTasks, icon: Activity, tone: 'blue' as const },
        { title: t('completed'), value: s.completedTasks, icon: CheckCircle2, tone: 'emerald' as const },
        { title: t('inTesting'), value: s.testingTasks, icon: FlaskConical, tone: 'amber' as const },
        { title: t('returned'), value: s.returnedTasks, icon: RotateCcw, tone: 'rose' as const },
        { title: t('activeEmployees'), value: s.activeEmployees, icon: Users, tone: 'violet' as const },
        { title: t('dueToday'), value: s.dueToday, icon: CalendarClock, tone: 'blue' as const },
        { title: t('overdue'), value: s.overdue, icon: AlarmClock, tone: 'rose' as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <AttendanceWidget />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.isLoading
          ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c, i) => <StatCard key={c.title} {...c} index={i} />)}
      </div>
      <EmployeeTasksStats />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('tasksPerEmployee')} loading={charts.isLoading}>
          {charts.data && <TasksPerEmployeeChart data={charts.data.tasksPerEmployee} />}
        </ChartCard>
        <ChartCard title={t('completedPerMonth')} loading={charts.isLoading}>
          {charts.data && <CompletedPerMonthChart data={charts.data.completedPerMonth} />}
        </ChartCard>
        <ChartCard title={t('statusDistribution')} loading={charts.isLoading}>
          {charts.data && <StatusDonutChart data={charts.data.statusDistribution} />}
        </ChartCard>
        <ChartCard title={t('priorityDistribution')} loading={charts.isLoading}>
          {charts.data && <PriorityBarsChart data={charts.data.priorityDistribution} />}
        </ChartCard>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const t = useTranslations('Dashboard');
  const stats = useEmployeeStats();
  const s = stats.data;

  const cards = s
    ? [
        { title: t('myTasks'), value: s.totalTasks, icon: ListTodo, tone: 'default' as const },
        { title: t('dueToday'), value: s.dueToday, icon: CalendarClock, tone: 'blue' as const },
        { title: t('overdue'), value: s.overdue, icon: AlarmClock, tone: 'rose' as const },
        { title: t('inTesting'), value: s.testingTasks, icon: FlaskConical, tone: 'amber' as const },
        { title: t('completed'), value: s.completedTasks, icon: CheckCircle2, tone: 'emerald' as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <AttendanceWidget />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.isLoading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c, i) => <StatCard key={c.title} {...c} index={i} />)}
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="relative overflow-hidden transition-shadow duration-300 hover:shadow-lift">
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="rounded-xl bg-brand-gradient p-3 text-white shadow-md">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{t('averageProgress')}</p>
                <p className="text-sm font-semibold">{s?.averageProgress ?? 0}%</p>
              </div>
              <Progress value={s?.averageProgress ?? 0} />
            </div>
            <Link
              href="/tasks"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Clock className="h-4 w-4" /> {t('viewMyTasks')}
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const greeting = getDynamicGreeting(locale, user?.name ?? '');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl border border-white/10 dark:border-white/5 bg-background/60 p-6 shadow-sm backdrop-blur-md relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting.title}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-muted-foreground font-medium">
            {greeting.subtitle}
          </p>
        </div>
      </div>
      {user?.role === 'ADMIN' ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}
