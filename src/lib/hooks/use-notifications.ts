'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from '@/lib/api/notifications';
import { getErrorMessage } from '@/lib/api/error';
import type { UpdatePreferenceRequest } from '@/lib/types';

const PAGE_SIZE = 10;

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) =>
      notificationsApi.getNotifications(pageParam as number, PAGE_SIZE).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 2),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data.count),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationsApi.markAsRead(notificationId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to mark notifications as read'));
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationsApi.getPreferences().then((r) => r.data),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePreferenceRequest) =>
      notificationsApi.updatePreferences(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      toast.success('Preferences updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update preferences'));
    },
  });
}
