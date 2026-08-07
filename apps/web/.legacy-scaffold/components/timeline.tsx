"use client";

import { motion } from "framer-motion";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import type { TaskHistoryEntry } from "@/lib/types";

export function TaskTimeline({ history }: { history: TaskHistoryEntry[] }) {
  if (!history.length) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {[...history].reverse().map((entry, i) => (
        <motion.li
          key={entry.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative"
        >
          <span className="absolute -left-[31px] flex h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
          <div className="flex flex-wrap items-center gap-2">
            {entry.fromStatus ? (
              <>
                <StatusBadge status={entry.fromStatus} />
                <span className="text-muted-foreground">→</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Created as</span>
            )}
            <StatusBadge status={entry.toStatus} />
          </div>
          {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.actor?.name ?? "System"} · {formatDateTime(entry.createdAt)}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
