'use client';

import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminCharts } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#6366f1',
  TESTING: '#f59e0b',
  COMPLETED: '#10b981',
  RETURNED: '#f43f5e',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#38bdf8',
  HIGH: '#fb923c',
  URGENT: '#f43f5e',
};

const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/** Glassmorphic tooltip shared by all charts. */
function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: { status?: string; priority?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-lift">
      <p className="text-xs font-medium text-muted-foreground">
        {item.payload?.status?.replace('_', ' ') ?? item.payload?.priority ?? label}
      </p>
      <p className="text-sm font-bold tabular-nums">
        {item.value} <span className="text-xs font-normal text-muted-foreground">tasks</span>
      </p>
    </div>
  );
}

const axisTick = { fontSize: 11, fill: 'var(--color-muted-foreground)' };
const axisLine = { stroke: 'var(--color-border)' };

export function TasksPerEmployeeChart({ data }: { data: AdminCharts['tasksPerEmployee'] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="28%">
        <defs>
          <linearGradient id="empBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="employeeName" tick={axisTick} axisLine={axisLine} tickLine={false} tickFormatter={(v: string) => v.split(' ')[0]} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'var(--color-muted)', radius: 8 }} />
        <Bar dataKey="count" name="Tasks" fill="url(#empBar)" radius={[8, 8, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompletedPerMonthChart({ data }: { data: AdminCharts['completedPerMonth'] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} axisLine={axisLine} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
        <Area
          type="monotone"
          dataKey="count"
          name="Completed"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#completedGrad)"
          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#10b981', stroke: 'var(--color-background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusDonutChart({ data }: { data: AdminCharts['statusDistribution'] }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={68}
            outerRadius={92}
            paddingAngle={4}
            cornerRadius={6}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<GlassTooltip />} />
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={(v: string) => (
              <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>{v.replace('_', ' ')}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[104px] text-center">
        <p className="text-2xl font-bold tabular-nums">{total}</p>
        <p className="text-xs text-muted-foreground">total tasks</p>
      </div>
    </div>
  );
}

export function PriorityBarsChart({ data }: { data: AdminCharts['priorityDistribution'] }) {
  const sorted = [...data].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} layout="vertical" barCategoryGap="30%">
        <CartesianGrid strokeDasharray="2 6" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="priority" tick={axisTick} axisLine={false} tickLine={false} width={70} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'var(--color-muted)', radius: 8 }} />
        <Bar dataKey="count" name="Tasks" radius={[0, 8, 8, 0]} maxBarSize={22}>
          {sorted.map((d) => (
            <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority] ?? '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChartCard({
  title,
  description,
  loading,
  children,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-shadow duration-300 hover:shadow-lift">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-[260px] w-full" /> : children}</CardContent>
    </Card>
  );
}
