import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getToasts } from '../../../components/feedback/toast';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import { UsersPage } from '../pages/UsersPage';
import { loginAs } from '../testing/session';
import type { UserSummary } from '../types';

vi.mock('../api');

const created: UserSummary & { emailSent: boolean } = {
  id: 20,
  email: 'binh@gmail.com',
  phone: '0912345678',
  displayName: 'Trần Bình',
  role: 'MEMBER',
  status: 'INACTIVE',
  code: 'MEM-1A2B3C4D',
  emailVerified: false,
  createdAt: '2026-10-25T00:00:00.000Z',
  emailSent: true,
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

async function openDialog() {
  loginAs('RECEPTIONIST');
  vi.mocked(api.listUsers).mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
  renderWithProviders(<UsersPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tạo hội viên' }));
  return screen.findByRole('dialog', { name: 'Tạo hội viên' });
}

function fillRequired(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText(/Họ tên/), { target: { value: 'Trần Bình' } });
  fireEvent.change(within(dialog).getByLabelText(/Email/), { target: { value: 'Binh@Gmail.com' } });
  fireEvent.change(within(dialog).getByLabelText(/Số điện thoại/), { target: { value: '0912345678' } });
}

describe('Tạo hội viên tại quầy (FR-08)', () => {
  test('bắt buộc họ tên, email, số điện thoại', async () => {
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo hội viên' }));
    expect(await within(dialog).findByText('Họ tên cần ít nhất 2 ký tự')).toBeInTheDocument();
    expect(within(dialog).getByText('Email không hợp lệ')).toBeInTheDocument();
    expect(within(dialog).getByText('Số điện thoại không hợp lệ')).toBeInTheDocument();
    expect(api.createMember).not.toHaveBeenCalled();
  });

  test('chỉ gửi trường đã nhập, hiện toast kèm mã hội viên', async () => {
    vi.mocked(api.createMember).mockResolvedValue(created);
    const dialog = await openDialog();
    fillRequired(dialog);
    fireEvent.change(within(dialog).getByLabelText(/Giới tính/), { target: { value: 'MALE' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo hội viên' }));

    await waitFor(() =>
      expect(api.createMember).toHaveBeenCalledWith({ displayName: 'Trần Bình', email: 'binh@gmail.com', phone: '0912345678', gender: 'MALE' }),
    );
    expect(getToasts().some((item) => item.message.includes('MEM-1A2B3C4D'))).toBe(true);
  });

  test('số điện thoại trùng hiện lỗi dưới ô số điện thoại', async () => {
    vi.mocked(api.createMember).mockRejectedValue(
      axiosError(409, { code: 'ACCOUNT_EXISTS', message: 'Số điện thoại đã được sử dụng', details: { field: 'phone' } }),
    );
    const dialog = await openDialog();
    fillRequired(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo hội viên' }));

    expect(await within(dialog).findByText('Số điện thoại đã được sử dụng')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Số điện thoại/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('email chưa gửi được thì toast cảnh báo', async () => {
    vi.mocked(api.createMember).mockResolvedValue({ ...created, emailSent: false });
    const dialog = await openDialog();
    fillRequired(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo hội viên' }));
    await waitFor(() => expect(getToasts().some((item) => item.message.includes('chưa gửi được email'))).toBe(true));
  });
});
