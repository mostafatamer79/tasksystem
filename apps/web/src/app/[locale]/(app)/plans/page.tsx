'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Plus, Search, BookOpen, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';
import { usePlans, useCreatePlan } from '@/lib/hooks';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function PlansPage() {
  const t = useTranslations('Plans');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlanTeacher, setNewPlanTeacher] = useState('');

  const { data: plansData, isLoading } = usePlans({ page, limit: 12, search });
  const { mutateAsync: createPlan, isPending: isCreating } = useCreatePlan();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTeacher) return;
    try {
      const newPlan = await createPlan({ title: `Plan for ${newPlanTeacher}`, teacherName: newPlanTeacher });
      setIsCreateOpen(false);
      setNewPlanTeacher('');
      router.push(`/plans/${newPlan.id}`);
    } catch (error) {
      console.error('Failed to create plan', error);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground border-border',
    SUBMITTED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PUBLISHED: 'bg-green-500/10 text-green-500 border-green-500/20',
    RETURNED: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tCommon('search')}
              className="w-full pl-9 sm:w-64"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span>{t('newPlan')}</span>
            </Button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : plansData?.data.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/10 p-8 text-center glass shadow-sm"
        >
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <BookOpen className="mb-4 h-14 w-14 text-muted-foreground/30" />
          </motion.div>
          <h3 className="text-xl font-bold tracking-tight">{t('emptyTasks')}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {isAdmin ? t('addFirstTask') : tCommon('nothingHere')}
          </p>
        </motion.div>
      ) : (
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {plansData?.data.map((plan) => {
            const totalTasks = plan.tasks?.length || 0;
            const completedTasks = plan.tasks?.filter((t) => t.task?.status === 'COMPLETED').length || 0;
            
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                }}
                key={plan.id}
                onClick={() => router.push(`/plans/${plan.id}`)}
                className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 p-6 shadow-sm backdrop-blur-md transition-all hover:bg-background/80 hover:border-primary/20 hover:shadow-lg active:scale-[0.98]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider font-bold ${statusColors[plan.status]} shadow-sm backdrop-blur-sm`}
                    >
                      {t(plan.status.toLowerCase() as Parameters<typeof t>[0])}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground backdrop-blur-sm shadow-sm transition-colors group-hover:bg-background">
                      <span>{completedTasks} / {totalTasks}</span>
                      <CheckCircle2 className={cn("h-3.5 w-3.5 transition-colors", completedTasks === totalTasks && totalTasks > 0 ? "text-green-500 drop-shadow-sm" : "opacity-40")} />
                    </div>
                  </div>
                  <h3 className="line-clamp-2 text-xl font-bold leading-tight tracking-tight text-foreground/90 group-hover:text-primary transition-colors">{plan.title}</h3>
                  <p className="mt-1.5 text-sm font-medium text-muted-foreground/80">{plan.teacherName}</p>
                </div>

                <div className="relative z-10 mt-8 flex items-center justify-between text-xs font-medium text-muted-foreground/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 opacity-70" />
                    <span>{new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', { dateStyle: 'medium' }).format(new Date(plan.updatedAt))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 opacity-70" />
                    <span>
                      {plan.periodStart
                        ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', { dateStyle: 'medium' }).format(new Date(plan.periodStart))
                        : '—'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Pagination Placeholder (You can add real pagination here using plansData) */}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title={t('newPlan')} description={t('subtitle')}>
        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('teacherName')}</label>
              <Input
                value={newPlanTeacher}
                onChange={(e) => setNewPlanTeacher(e.target.value)}
                placeholder={t('teacherName')}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isCreating || !newPlanTeacher}>
              {isCreating ? tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
