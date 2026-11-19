import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getToasts } from '../../../components/feedback/toast';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import { UsersPage } from '../pages/UsersPage';
import { loginAs } from '../testing/session';
import type { UserListPage } from '../types';

vi.mock('../api');

const list: UserListPage = {
  items: [
    { id: 5, email: 'binh@sportigo.vn', phone: null, displayName: 'Trần Bình', role: 'MEMBER', status: 'ACTIVE', code: 'MEM-005', emailVerified: true, createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 6, email: 'lan@sportigo.vn', phone: null, displayName: 'Lê Lan', role: 'COACH', status: 'LOCKED', code: 'COA-02', emailVerified: true, createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 1, email: 'admin@sportigo.vn', phone: null, displayName: 'Admin', role: 'CENTER_MANAGER', status: 'ACTIVE', code: null, emailVerified: true, createdAt: '2026-10-01T00:00:00.000Z' },
  ],
  page: 1,
  pageSize: 20,
  total: 3,
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

async function openPage() {
  loginAs('CENTER_MANAGER');
  vi.mocked(api.listUsers).mockResolvedValue(list);
  renderWithProviders(<UsersPage />);
  await screen.findByText('Trần Bình');
}

describe('Khóa / mở khóa tài khoản (FR-06)', () => {
  test('Manager thấy nút Khóa/Mở khóa, không có nút ở dòng Center Manager', async () => {
    await openPage();
    expect(screen.getByRole('button', { name: 'Khóa Trần Bình' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở khóa Lê Lan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Admin/ })).not.toBeInTheDocument();
  });

  test('Receptionist không thấy cột thao tác', async () => {
    loginAs('RECEPTIONIST');
    vi.mocked(api.listUsers).mockResolvedValue(list);
    renderWithProviders(<UsersPage />);
    await screen.findByText('Trần Bình');
    expect(screen.queryByRole('button', { name: /^Khóa/ })).not.toBeInTheDocument();
  });

  test('bắt buộc nhập lý do trước khi khóa', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Khóa Trần Bình' }));
    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản' }));
    expect(await screen.findByText('Lý do cần ít nhất 3 ký tự')).toBeInTheDocument();
    expect(api.changeUserStatus).not.toHaveBeenCalled();
  });

  test('khóa thành công gửi LOCKED + lý do và hiện toast', async () => {
    vi.mocked(api.changeUserStatus).mockResolvedValue({ ...list.items[0], status: 'LOCKED' });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Khóa Trần Bình' }));
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Vi phạm nội quy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản' }));

    await waitFor(() => expect(api.changeUserStatus).toHaveBeenCalledWith(5, { status: 'LOCKED', reason: 'Vi phạm nội quy' }));
    expect(getToasts().some((item) => item.message === 'Đã khóa tài khoản Trần Bình.')).toBe(true);
  });

  test('mở khóa gửi ACTIVE', async () => {
    vi.mocked(api.changeUserStatus).mockResolvedValue({ ...list.items[1], status: 'ACTIVE' });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa Lê Lan' }));
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Đã xác minh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa' }));
    await waitFor(() => expect(api.changeUserStatus).toHaveBeenCalledWith(6, { status: 'ACTIVE', reason: 'Đã xác minh' }));
  });

  test('lỗi 409 từ server hiện trong hộp thoại', async () => {
    vi.mocked(api.changeUserStatus).mockRejectedValue(
      axiosError(409, { code: 'STATUS_CONFLICT', message: 'Trạng thái tài khoản vừa bị thay đổi, vui lòng tải lại' }),
    );
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Khóa Trần Bình' }));
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Vi phạm nội quy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản' }));
    expect(await screen.findByText('Trạng thái tài khoản vừa bị thay đổi, vui lòng tải lại')).toBeInTheDocument();
  });
});
