import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getToasts } from '../../../components/feedback/toast';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import { ChangePasswordForm } from './ChangePasswordForm';

vi.mock('../api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function fill(values: { current?: string; next?: string; confirm?: string }) {
  if (values.current !== undefined) fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: values.current } });
  if (values.next !== undefined) fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: values.next } });
  if (values.confirm !== undefined) fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu mới/), { target: { value: values.confirm } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

describe('Form đổi mật khẩu (FR-62)', () => {
  test('mật khẩu xác nhận không khớp thì báo lỗi, không gọi API', async () => {
    renderWithProviders(<ChangePasswordForm />);
    fill({ current: 'oldpass123', next: 'newpass123', confirm: 'newpass124' });
    submit();
    expect(await screen.findByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  test('mật khẩu mới ngắn hoặc trùng mật khẩu hiện tại thì báo lỗi', async () => {
    renderWithProviders(<ChangePasswordForm />);
    fill({ current: 'oldpass123', next: 'short', confirm: 'short' });
    submit();
    expect(await screen.findByText('Mật khẩu mới phải có ít nhất 8 ký tự')).toBeInTheDocument();

    fill({ next: 'oldpass123', confirm: 'oldpass123' });
    submit();
    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu hiện tại')).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  test('400 INVALID_CURRENT_PASSWORD gắn lỗi vào ô Mật khẩu hiện tại', async () => {
    vi.mocked(api.changePassword).mockRejectedValue(
      axiosError(400, { code: 'INVALID_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng' }),
    );
    renderWithProviders(<ChangePasswordForm />);
    fill({ current: 'wrongpass1', next: 'newpass123', confirm: 'newpass123' });
    submit();

    expect(await screen.findByText('Mật khẩu hiện tại không đúng')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu hiện tại/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Mật khẩu mới/)).not.toHaveAttribute('aria-invalid');
  });

  test('400 SAME_AS_CURRENT_PASSWORD gắn lỗi vào ô Mật khẩu mới', async () => {
    vi.mocked(api.changePassword).mockRejectedValue(
      axiosError(400, { code: 'SAME_AS_CURRENT_PASSWORD', message: 'Mật khẩu mới phải khác mật khẩu hiện tại' }),
    );
    renderWithProviders(<ChangePasswordForm />);
    fill({ current: 'oldpass123', next: 'newpass123', confirm: 'newpass123' });
    submit();

    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu hiện tại')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('422 map details.fieldErrors vào đúng ô', async () => {
    vi.mocked(api.changePassword).mockRejectedValue(
      axiosError(422, {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: { fieldErrors: { newPassword: ['Mật khẩu phải có ít nhất 8 ký tự'] } },
      }),
    );
    renderWithProviders(<ChangePasswordForm />);
    fill({ current: 'oldpass123', next: 'newpass123', confirm: 'newpass123' });
    submit();

    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('thành công: gửi đúng body, reset 3 ô và hiện toast', async () => {
    vi.mocked(api.changePassword).mockResolvedValue({ message: 'Đổi mật khẩu thành công.', accessToken: 'new-token' });
    renderWithProviders(<ChangePasswordForm />);
    fill({ current: 'oldpass123', next: 'newpass123', confirm: 'newpass123' });
    submit();

    await waitFor(() =>
      expect(api.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText(/Mật khẩu hiện tại/)).toHaveValue(''));
    expect(screen.getByLabelText(/^Mật khẩu mới/)).toHaveValue('');
    expect(screen.getByLabelText(/Nhập lại mật khẩu mới/)).toHaveValue('');
    expect(getToasts().some((item) => item.message === 'Đổi mật khẩu thành công.' && item.tone === 'success')).toBe(true);
  });

  test('có link Quên mật khẩu cho tài khoản Google', () => {
    renderWithProviders(<ChangePasswordForm />);
    expect(screen.getByRole('link', { name: 'Quên mật khẩu' })).toHaveAttribute('href', '/forgot-password');
  });
});
