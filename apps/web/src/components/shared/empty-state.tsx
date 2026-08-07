'use client';

import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={cn('flex flex-col items-center justify-center gap-2.5 text-center', className)}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-25 blur-xl" />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative rounded-2xl border bg-card p-4 text-muted-foreground shadow-soft"
        >
          {icon ?? <Inbox className="h-7 w-7" />}
        </motion.div>
      </div>
      <p className="mt-1 font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
