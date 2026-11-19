import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api';
import type { NotificationPage } from '../types';

export const notificationKeys = {
  all: ['notifications'] as const,
  latest: () => [...notificationKeys.all, 'latest'] as const,
};

const LATEST_SIZE = 10;
// note: chưa có websocket nên hỏi lại server mỗi 60 giây để chuông cập nhật số chưa đọc
const POLL_MS = 60_000;

export function useLatestNotifications(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.latest(),
    queryFn: () => getNotifications({ pageSize: LATEST_SIZE }),
    retry: retryServerErrors,
    refetchInterval: enabled ? POLL_MS : false,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    // note: cập nhật cache ngay để chấm đỏ tắt liền, không chờ refetch
    onSuccess: (_result, id) => {
      queryClient.setQueryData<NotificationPage>(notificationKeys.latest(), (page) => {
        if (!page) return page;
        const target = page.items.find((item) => item.id === id);
        if (!target || target.isRead) return page;
        return {
          ...page,
          unreadCount: Math.max(0, page.unreadCount - 1),
          items: page.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
        };
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData<NotificationPage>(notificationKeys.latest(), (page) =>
        page ? { ...page, unreadCount: 0, items: page.items.map((item) => ({ ...item, isRead: true })) } : page,
      );
      return queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
