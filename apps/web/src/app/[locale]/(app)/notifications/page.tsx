'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  errorMessage,
} from '@/lib/hooks';
import { formatDateTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const [page, setPage] = useState(1);
  const notifications = useNotifications(page, 20);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const data = notifications.data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {data?.unread ? t('unreadCount', { count: data.unread }) : t('allCaughtUp')}
          </p>
        </div>
        {(data?.unread ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={markAll.isPending}
            onClick={async () => {
              try {
                await markAll.mutateAsync();
                toast.success(t('markedAllRead'));
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            <CheckCheck className="h-4 w-4" /> {t('markAllRead')}
          </Button>
        )}
      </div>

      {notifications.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            icon={<Bell className="h-6 w-6" />}
            className="py-16"
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.data.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card
                className={cn(
                  'relative flex items-start gap-3 overflow-hidden p-4 transition-all duration-300 hover:shadow-lift',
                  !n.readAt && 'border-primary/30 shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]',
                )}
              >
                {!n.readAt && (
                  <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-brand-gradient opacity-20 blur-2xl" />
                )}
                <div
                  className={cn(
                    'relative mt-0.5 rounded-xl p-2.5',
                    n.readAt ? 'bg-muted text-muted-foreground' : 'bg-brand-gradient text-white shadow-md',
                  )}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', !n.readAt && 'font-semibold')}>{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {n.taskId && (
                    <Link href={`/tasks/${n.taskId}`} className="text-xs font-medium text-primary hover:underline">
                      {t('viewTask')}
                    </Link>
                  )}
                  {!n.readAt && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      {t('markRead')}
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Pagination
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </motion.div>
  );
}
