'use client';

import { motion } from 'framer-motion';
import { cn, formatDateTime } from '@/lib/utils';
import { StatusBadge } from './badges';
import type { TaskHistoryEntry } from '@/lib/types';

export function Timeline({ entries }: { entries: TaskHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-6">
      {/* animated connector line */}
      <motion.span
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute left-[5px] top-2 bottom-2 w-px origin-top bg-gradient-to-b from-primary/60 via-border to-transparent"
      />
      {entries.map((e, i) => (
        <motion.li
          key={e.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
          className="relative pl-7"
        >
          <span
            className={cn(
              'absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-background',
              i === 0 ? 'bg-brand-gradient shadow-glow' : 'bg-muted-foreground/40',
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            {e.fromStatus ? (
              <>
                <StatusBadge status={e.fromStatus} />
                <span className="text-muted-foreground">→</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Created as</span>
            )}
            <StatusBadge status={e.toStatus} />
          </div>
          {e.note && (
            <p className="mt-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
              {e.note}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {e.actor?.name ?? 'System'} · {formatDateTime(e.createdAt)}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
