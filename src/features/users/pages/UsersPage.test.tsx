import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import { loginAs } from '../testing/session';
import type { UserListPage } from '../types';
import { UsersPage } from './UsersPage';

vi.mock('../api');

const page = (overrides: Partial<UserListPage> = {}): UserListPage => ({
  items: [
    { id: 5, email: 'binh@sportigo.vn', phone: '0912345678', displayName: 'Trần Bình', role: 'MEMBER', status: 'ACTIVE', code: 'MEM-005', emailVerified: true, createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 6, email: 'coach@sportigo.vn', phone: null, displayName: 'Coach Minh', role: 'COACH', status: 'LOCKED', code: 'COA-01', emailVerified: true, createdAt: '2026-10-01T00:00:00.000Z' },
  ],
  page: 1,
  pageSize: 20,
  total: 2,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

describe('Trang quản lý người dùng (FR-09)', () => {
  test('Manager thấy bảng người dùng với vai trò, mã và trạng thái', async () => {
    loginAs('CENTER_MANAGER');
    vi.mocked(api.listUsers).mockResolvedValue(page());
    renderWithProviders(<UsersPage />);

    expect(await screen.findByText('Trần Bình')).toBeInTheDocument();
    expect(screen.getByText('MEM-005')).toBeInTheDocument();
    // note: "Đã khóa" còn là option của bộ lọc trạng thái nên tìm trong ô của bảng
    expect(screen.getByRole('cell', { name: 'Đã khóa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Lọc theo vai trò')).toBeInTheDocument();
    expect(api.listUsers).toHaveBeenCalledWith({ q: undefined, role: undefined, status: undefined, page: 1, pageSize: 20 });
  });

  test('gõ từ khóa thì gọi API sau khi ngừng gõ, lọc role và status gửi đúng tham số', async () => {
    loginAs('CENTER_MANAGER');
    vi.mocked(api.listUsers).mockResolvedValue(page());
    renderWithProviders(<UsersPage />);
    await screen.findByText('Trần Bình');

    fireEvent.change(screen.getByLabelText('Tìm kiếm người dùng'), { target: { value: '  bình ' } });
    await waitFor(() => expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'bình', page: 1 })));

    fireEvent.change(screen.getByLabelText('Lọc theo vai trò'), { target: { value: 'COACH' } });
    fireEvent.change(screen.getByLabelText('Lọc theo trạng thái'), { target: { value: 'LOCKED' } });
    await waitFor(() =>
      expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'bình', role: 'COACH', status: 'LOCKED' })),
    );
  });

  test('Receptionist không có bộ lọc vai trò và tiêu đề là tra cứu hội viên', async () => {
    loginAs('RECEPTIONIST');
    vi.mocked(api.listUsers).mockResolvedValue(page());
    renderWithProviders(<UsersPage />);

    expect(await screen.findByRole('heading', { name: 'Tra cứu hội viên' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Lọc theo vai trò')).not.toBeInTheDocument();
  });

  test('không có kết quả thì hiện trạng thái rỗng', async () => {
    loginAs('CENTER_MANAGER');
    vi.mocked(api.listUsers).mockResolvedValue(page({ items: [], total: 0 }));
    renderWithProviders(<UsersPage />);
    expect(await screen.findByText('Không tìm thấy người dùng')).toBeInTheDocument();
  });

  test('chuyển trang gửi page mới', async () => {
    loginAs('CENTER_MANAGER');
    vi.mocked(api.listUsers).mockResolvedValue(page({ total: 45 }));
    renderWithProviders(<UsersPage />);
    await screen.findByText('Trần Bình');

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
