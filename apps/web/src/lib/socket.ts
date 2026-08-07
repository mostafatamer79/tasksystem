'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from './api';
import type { AppNotification, NotificationsPage } from './types';
import { useAuthStore } from './store';

/**
 * Polls the /notifications API every 1 minute (60 seconds)
 * to fetch unread notifications, showing toasts for new ones,
 * and invalidating TanStack Query caches.
 */
export function useNotificationsSocket() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef(true);

  useEffect(() => {
    if (!user) {
      seenIdsRef.current.clear();
      isInitialFetchRef.current = true;
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await api.get<NotificationsPage>('/notifications', {
          params: { page: 1, limit: 50 },
        });
        const notifications = response.data.data;

        let hasNewTasks = false;
        const newNotifications: AppNotification[] = [];

        for (const n of notifications) {
          // If notification is unread and we haven't seen it yet
          if (!n.readAt && !seenIdsRef.current.has(n.id)) {
            seenIdsRef.current.add(n.id);
            if (!isInitialFetchRef.current) {
              newNotifications.push(n);
              if (n.taskId) {
                hasNewTasks = true;
              }
            }
          }
        }

        // After the very first fetch, we just mark that we are no longer initial
        if (isInitialFetchRef.current) {
          isInitialFetchRef.current = false;
        } else if (newNotifications.length > 0) {
          // Trigger toasts for new notifications in reverse order (oldest first)
          newNotifications.reverse().forEach((n) => {
            toast(n.title, { description: n.body });
          });

          // Invalidate notifications query
          qc.invalidateQueries({ queryKey: ['notifications'] });
          if (hasNewTasks) {
            qc.invalidateQueries({ queryKey: ['tasks'] });
          }
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    };

    // Run immediately on mount/login
    fetchNotifications();

    // Poll every 60 seconds (1 minute)
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user, qc]);
}

