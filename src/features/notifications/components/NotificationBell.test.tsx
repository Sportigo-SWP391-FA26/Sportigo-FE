import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { NotificationPage } from '../types';
import { NotificationBell } from './NotificationBell';

vi.mock('../api');

const page = (overrides: Partial<NotificationPage> = {}): NotificationPage => ({
  items: [
    { id: 1, title: 'Thanh toán thành công', content: 'Đơn ORD-1 đã thanh toán.', type: 'PAYMENT_SUCCESS', isRead: false, createdAt: '2026-10-25T02:00:00.000Z' },
    { id: 2, title: 'Tài khoản đã được xác minh', content: 'Chào mừng bạn.', type: 'ACCOUNT_VERIFIED', isRead: true, createdAt: '2026-10-24T02:00:00.000Z' },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
  unreadCount: 1,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Chuông thông báo (FR-54)', () => {
  test('hiện số chưa đọc trên nút và danh sách khi mở', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue(page());
    renderWithProviders(<NotificationBell />);

    const bell = await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' });
    fireEvent.click(bell);

    expect(screen.getByRole('dialog', { name: 'Thông báo' })).toBeInTheDocument();
    expect(screen.getByText('Thanh toán thành công')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản đã được xác minh')).toBeInTheDocument();
    expect(api.getNotifications).toHaveBeenCalledWith({ pageSize: 10 });
  });

  test('bấm thông báo chưa đọc thì đánh dấu đã đọc và giảm số đếm', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue(page());
    vi.mocked(api.markNotificationRead).mockResolvedValue({ id: 1, isRead: true });
    renderWithProviders(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' }));
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán thành công/ }));

    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith(1));
    expect(await screen.findByRole('button', { name: 'Thông báo' })).toBeInTheDocument();
  });

  test('bấm thông báo đã đọc thì không gọi API', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue(page());
    renderWithProviders(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: /1 chưa đọc/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tài khoản đã được xác minh/ }));
    expect(api.markNotificationRead).not.toHaveBeenCalled();
  });

  test('đánh dấu tất cả đã đọc; nút bị khóa khi không còn chưa đọc', async () => {
    vi.mocked(api.getNotifications).mockResolvedValueOnce(page()).mockResolvedValue(page({ unreadCount: 0 }));
    vi.mocked(api.markAllNotificationsRead).mockResolvedValue({ updated: 1 });
    renderWithProviders(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: /1 chưa đọc/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));

    await waitFor(() => expect(api.markAllNotificationsRead).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toBeDisabled());
  });

  test('chưa đăng nhập (enabled=false) thì không gọi API', () => {
    renderWithProviders(<NotificationBell enabled={false} />);
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument();
    expect(api.getNotifications).not.toHaveBeenCalled();
  });

  test('Esc đóng dropdown', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue(page({ items: [], total: 0, unreadCount: 0 }));
    renderWithProviders(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }));
    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
