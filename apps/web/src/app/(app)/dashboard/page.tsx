'use client';

import Link from 'next/link';
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
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useAdminStats, useAdminCharts, useEmployeeStats } from '@/lib/hooks';
import { StatCard, StatCardSkeleton } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  ChartCard,
  CompletedPerMonthChart,
  PriorityBarsChart,
  StatusDonutChart,
  TasksPerEmployeeChart,
} from '@/components/shared/charts';

function AdminDashboard() {
  const stats = useAdminStats();
  const charts = useAdminCharts();

  const s = stats.data;
  const cards = s
    ? [
        { title: 'Total Tasks', value: s.totalTasks, icon: ListTodo, tone: 'default' as const },
        { title: 'Active Tasks', value: s.activeTasks, icon: Activity, tone: 'blue' as const },
        { title: 'Completed', value: s.completedTasks, icon: CheckCircle2, tone: 'emerald' as const },
        { title: 'In Testing', value: s.testingTasks, icon: FlaskConical, tone: 'amber' as const },
        { title: 'Returned', value: s.returnedTasks, icon: RotateCcw, tone: 'rose' as const },
        { title: 'Active Employees', value: s.activeEmployees, icon: Users, tone: 'violet' as const },
        { title: 'Due Today', value: s.dueToday, icon: CalendarClock, tone: 'blue' as const },
        { title: 'Overdue', value: s.overdue, icon: AlarmClock, tone: 'rose' as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.isLoading
          ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c, i) => <StatCard key={c.title} {...c} index={i} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tasks per Employee" loading={charts.isLoading}>
          {charts.data && <TasksPerEmployeeChart data={charts.data.tasksPerEmployee} />}
        </ChartCard>
        <ChartCard title="Completed per Month" loading={charts.isLoading}>
          {charts.data && <CompletedPerMonthChart data={charts.data.completedPerMonth} />}
        </ChartCard>
        <ChartCard title="Status Distribution" loading={charts.isLoading}>
          {charts.data && <StatusDonutChart data={charts.data.statusDistribution} />}
        </ChartCard>
        <ChartCard title="Priority Distribution" loading={charts.isLoading}>
          {charts.data && <PriorityBarsChart data={charts.data.priorityDistribution} />}
        </ChartCard>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const stats = useEmployeeStats();
  const s = stats.data;

  const cards = s
    ? [
        { title: 'My Tasks', value: s.totalTasks, icon: ListTodo, tone: 'default' as const },
        { title: 'Due Today', value: s.dueToday, icon: CalendarClock, tone: 'blue' as const },
        { title: 'Overdue', value: s.overdue, icon: AlarmClock, tone: 'rose' as const },
        { title: 'In Testing', value: s.testingTasks, icon: FlaskConical, tone: 'amber' as const },
        { title: 'Completed', value: s.completedTasks, icon: CheckCircle2, tone: 'emerald' as const },
      ]
    : [];

  return (
    <div className="space-y-6">
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
                <p className="font-medium">Average progress on active tasks</p>
                <p className="text-sm font-semibold">{s?.averageProgress ?? 0}%</p>
              </div>
              <Progress value={s?.averageProgress ?? 0} />
            </div>
            <Link
              href="/tasks"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Clock className="h-4 w-4" /> View my tasks
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, <span className="text-brand-gradient">{user?.name.split(' ')[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.role === 'ADMIN' ? 'Team-wide overview' : 'Here is what is on your plate'}
        </p>
      </div>
      {user?.role === 'ADMIN' ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}
