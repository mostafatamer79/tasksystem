'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Eased count-up animation from 0 → target on mount / target change. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'blue' | 'amber' | 'emerald' | 'rose' | 'violet';
  index?: number;
}

const chipTones: Record<string, string> = {
  default: 'from-slate-400 to-slate-600',
  blue: 'from-blue-400 to-indigo-600',
  amber: 'from-amber-400 to-orange-600',
  emerald: 'from-emerald-400 to-teal-600',
  rose: 'from-rose-400 to-red-600',
  violet: 'from-violet-400 to-fuchsia-600',
};

export function StatCard({ title, value, icon: Icon, hint, tone = 'default', index = 0 }: StatCardProps) {
  const numeric = typeof value === 'number';
  const animated = useCountUp(numeric ? value : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="group relative h-full overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lift">
        {/* faint corner glow on hover */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-gradient opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div
            className={cn(
              'rounded-xl bg-gradient-to-br p-2.5 text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
              chipTones[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {numeric ? animated : value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </Card>
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
    </Card>
  );
}
