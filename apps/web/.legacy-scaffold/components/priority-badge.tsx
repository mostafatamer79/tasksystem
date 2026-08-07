import { ArrowDown, ArrowUp, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/types";

const config: Record<Priority, { label: string; className: string; Icon: typeof Minus }> = {
  LOW: { label: "Low", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20", Icon: ArrowDown },
  MEDIUM: { label: "Medium", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20", Icon: Minus },
  HIGH: { label: "High", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", Icon: ArrowUp },
  URGENT: { label: "Urgent", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", Icon: AlertTriangle },
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#0ea5e9",
  HIGH: "#f97316",
  URGENT: "#ef4444",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { label, className: cls, Icon } = config[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
