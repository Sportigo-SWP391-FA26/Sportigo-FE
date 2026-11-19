import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getToasts } from '../../../components/feedback/toast';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { MyProfile } from '../types';
import { ProfileForm } from './ProfileForm';

// note: giả lập toàn bộ API hồ sơ, test chỉ kiểm tra luồng giao diện 2 bước
vi.mock('../api');

const profile: MyProfile = {
  id: 7,
  email: 'giang@sportigo.vn',
  phone: '0912345678',
  displayName: 'Nguyễn Trường Giang',
  role: 'CENTER_MANAGER',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  member: null,
  coach: null,
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// note: mở hộp thoại từ nút "Đổi email" trên form hồ sơ, giống cách người dùng thao tác
async function openDialog() {
  renderWithProviders(<ProfileForm profile={profile} />);
  fireEvent.click(screen.getByRole('button', { name: 'Đổi email' }));
  return screen.findByRole('dialog', { name: 'Đổi email đăng nhập' });
}

function fillRequest(dialog: HTMLElement, email = 'giang.moi@gmail.com', password = 'matkhau123') {
  fireEvent.change(within(dialog).getByLabelText(/Email mới/), { target: { value: email } });
  fireEvent.change(within(dialog).getByLabelText(/Mật khẩu hiện tại/), { target: { value: password } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi mã xác nhận' }));
}

describe('Đổi email (FR-05)', () => {
  test('bước 1 gửi email mới + mật khẩu, bước 2 nhập OTP thì đổi email', async () => {
    vi.mocked(api.requestEmailChange).mockResolvedValue({ message: 'ok', newEmail: 'giang.moi@gmail.com', expiresAt: '2026-10-25T08:10:00.000Z' });
    vi.mocked(api.confirmEmailChange).mockResolvedValue({ ...profile, email: 'giang.moi@gmail.com' });
    const dialog = await openDialog();

    fillRequest(dialog, 'Giang.Moi@Gmail.com');
    await waitFor(() => expect(api.requestEmailChange).toHaveBeenCalledWith({ newEmail: 'giang.moi@gmail.com', currentPassword: 'matkhau123' }));

    expect(await within(dialog).findByText('giang.moi@gmail.com')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Mã OTP/), { target: { value: '123456' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đổi email' }));

    await waitFor(() => expect(api.confirmEmailChange).toHaveBeenCalledWith('123456'));
    expect(getToasts().some((item) => item.message === 'Đã đổi email đăng nhập thành giang.moi@gmail.com.')).toBe(true);
  });

  test('kiểm tra dữ liệu ở FE: email sai định dạng hoặc trùng email hiện tại', async () => {
    const dialog = await openDialog();
    fillRequest(dialog, 'khong-phai-email');
    expect(await within(dialog).findByText('Email không hợp lệ')).toBeInTheDocument();

    fillRequest(dialog, 'giang@sportigo.vn');
    expect(await within(dialog).findByText('Email mới phải khác email hiện tại')).toBeInTheDocument();
    expect(api.requestEmailChange).not.toHaveBeenCalled();
  });

  test('sai mật khẩu hoặc email đã có người dùng thì báo dưới đúng ô', async () => {
    vi.mocked(api.requestEmailChange).mockRejectedValueOnce(
      axiosError(400, { code: 'INVALID_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng' }),
    );
    const dialog = await openDialog();
    fillRequest(dialog);
    expect(await within(dialog).findByText('Mật khẩu hiện tại không đúng')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Mật khẩu hiện tại/)).toHaveAttribute('aria-invalid', 'true');

    vi.mocked(api.requestEmailChange).mockRejectedValueOnce(
      axiosError(409, { code: 'ACCOUNT_EXISTS', message: 'Email đã được sử dụng', details: { field: 'newEmail' } }),
    );
    fillRequest(dialog);
    expect(await within(dialog).findByText('Email đã được sử dụng')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Email mới/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('OTP sai hiện lỗi ở ô mã; "Gửi lại mã" gọi lại bước 1 với dữ liệu cũ', async () => {
    vi.mocked(api.requestEmailChange).mockResolvedValue({ message: 'ok', newEmail: 'giang.moi@gmail.com', expiresAt: '2026-10-25T08:10:00.000Z' });
    vi.mocked(api.confirmEmailChange).mockRejectedValueOnce(
      axiosError(400, { code: 'INVALID_EMAIL_CHANGE_CODE', message: 'Mã OTP không đúng hoặc đã hết hạn' }),
    );
    const dialog = await openDialog();
    fillRequest(dialog);
    const codeInput = await within(dialog).findByLabelText(/Mã OTP/);

    fireEvent.change(codeInput, { target: { value: '999999' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đổi email' }));
    expect(await within(dialog).findByText('Mã OTP không đúng hoặc đã hết hạn')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi lại mã' }));
    await waitFor(() => expect(api.requestEmailChange).toHaveBeenCalledTimes(2));
    expect(api.requestEmailChange).toHaveBeenLastCalledWith({ newEmail: 'giang.moi@gmail.com', currentPassword: 'matkhau123' });
  });

  test('mã OTP phải đủ 6 chữ số trước khi gửi', async () => {
    vi.mocked(api.requestEmailChange).mockResolvedValue({ message: 'ok', newEmail: 'giang.moi@gmail.com', expiresAt: '2026-10-25T08:10:00.000Z' });
    const dialog = await openDialog();
    fillRequest(dialog);
    fireEvent.change(await within(dialog).findByLabelText(/Mã OTP/), { target: { value: '12a' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đổi email' }));
    expect(await within(dialog).findByText('Mã OTP gồm đúng 6 chữ số')).toBeInTheDocument();
    expect(api.confirmEmailChange).not.toHaveBeenCalled();
  });
});
