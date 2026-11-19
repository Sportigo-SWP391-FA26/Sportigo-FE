import { apiClient } from '../../api/client';
import type { NotificationPage } from './types';

// FR-54
export async function getNotifications(params: { page?: number; pageSize?: number; unread?: boolean } = {}) {
  const { data } = await apiClient.get<NotificationPage>('/notifications', {
    // note: backend chỉ nhận unread là chuỗi "true"/"false"; không gửi khi không lọc
    params: { page: params.page, pageSize: params.pageSize, unread: params.unread ? 'true' : undefined },
  });
  return data;
}

export async function markNotificationRead(id: number) {
  const { data } = await apiClient.patch<{ id: number; isRead: true }>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.patch<{ updated: number }>('/notifications/read-all');
  return data;
}
