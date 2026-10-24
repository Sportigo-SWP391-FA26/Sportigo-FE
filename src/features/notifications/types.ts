// Khớp response GET /api/notifications (Sportigo-BE/src/modules/notifications)
export type AppNotification = {
  id: number;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: AppNotification[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
};
