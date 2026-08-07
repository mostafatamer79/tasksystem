"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_COLORS } from "@/components/status-badge";
import { PRIORITY_COLORS } from "@/components/priority-badge";
import type { AdminCharts } from "@/lib/types";

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return {
    grid: dark ? "#26262a" : "#e5e7eb",
    text: dark ? "#9ca3af" : "#6b7280",
    tooltipStyle: {
      backgroundColor: dark ? "#141416" : "#ffffff",
      border: `1px solid ${dark ? "#26262a" : "#e5e7eb"}`,
      borderRadius: 12,
      fontSize: 12,
      color: dark ? "#fafafa" : "#0a0a0a",
    } as const,
  };
}

export function TasksPerEmployeeChart({ data }: { data: AdminCharts["tasksPerEmployee"] }) {
  const t = useChartTheme();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Tasks per Employee</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
            <XAxis dataKey="employeeName" tick={{ fill: t.text, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: t.text, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={t.tooltipStyle} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CompletedPerMonthChart({ data }: { data: AdminCharts["completedPerMonth"] }) {
  const t = useChartTheme();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Completed per Month</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: t.text, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: t.text, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={t.tooltipStyle} />
            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#completedFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StatusDonutChart({ data }: { data: AdminCharts["statusDistribution"] }) {
  const t = useChartTheme();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
              ))}
            </Pie>
            <Tooltip contentStyle={t.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PriorityBarsChart({ data }: { data: AdminCharts["priorityDistribution"] }) {
  const t = useChartTheme();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Priority Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: t.text, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="priority" tick={{ fill: t.text, fontSize: 12 }} tickLine={false} axisLine={false} width={70} />
            <Tooltip contentStyle={t.tooltipStyle} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {data.map((d) => (
                <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
