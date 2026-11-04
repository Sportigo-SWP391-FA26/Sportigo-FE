import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getToasts } from '../../../components/feedback/toast';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { MyProfile } from '../types';
import { ProfileForm } from './ProfileForm';

vi.mock('../api');

const base = {
  id: 7,
  email: 'giang@sportigo.vn',
  phone: '0912345678',
  displayName: 'Nguyễn Trường Giang',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  member: null,
  coach: null,
} as const;

const member: MyProfile = {
  ...base,
  role: 'MEMBER',
  member: { memberCode: 'MEM-007', dateOfBirth: '2004-10-14', gender: 'MALE', emergencyContact: null, trainingGoal: 'Tăng sức bền', joinedAt: '2026-10-01T00:00:00.000Z' },
};
const coach: MyProfile = { ...base, role: 'COACH', coach: { coachCode: 'COA-01', bio: 'HLV bơi', hiredAt: null } };
const manager: MyProfile = { ...base, role: 'CENTER_MANAGER' };

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Form hồ sơ cá nhân (FR-05)', () => {
  test('Member thấy trường hội viên, không thấy Giới thiệu', () => {
    renderWithProviders(<ProfileForm profile={member} />);
    expect(screen.getByLabelText('Ngày sinh')).toHaveValue('2004-10-14');
    expect(screen.getByLabelText('Giới tính')).toBeInTheDocument();
    expect(screen.getByLabelText('Liên hệ khẩn cấp')).toBeInTheDocument();
    expect(screen.getByLabelText('Mục tiêu tập luyện')).toHaveValue('Tăng sức bền');
    expect(screen.queryByLabelText(/Giới thiệu/)).not.toBeInTheDocument();
    expect(screen.getByText('MEM-007')).toBeInTheDocument();
  });

  test('Coach chỉ thấy Giới thiệu, Manager chỉ thấy họ tên và số điện thoại', () => {
    renderWithProviders(<ProfileForm profile={coach} />);
    expect(screen.getByLabelText(/Giới thiệu/)).toHaveValue('HLV bơi');
    expect(screen.queryByLabelText('Ngày sinh')).not.toBeInTheDocument();
    cleanup();

    renderWithProviders(<ProfileForm profile={manager} />);
    expect(screen.getByLabelText(/Họ tên/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Ngày sinh')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Giới thiệu/)).not.toBeInTheDocument();
  });

  test('email chỉ hiển thị, không có ô nhập', () => {
    renderWithProviders(<ProfileForm profile={member} />);
    expect(screen.getByText('giang@sportigo.vn')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Email/ })).not.toBeInTheDocument();
  });

  test('chặn số điện thoại sai định dạng, không gọi API', async () => {
    renderWithProviders(<ProfileForm profile={member} />);
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Số điện thoại không hợp lệ')).toBeInTheDocument();
    expect(api.updateMyProfile).not.toHaveBeenCalled();
  });

  test('409 trùng số điện thoại gắn lỗi vào ô Số điện thoại', async () => {
    vi.mocked(api.updateMyProfile).mockRejectedValue(
      axiosError(409, { code: 'ACCOUNT_EXISTS', message: 'Số điện thoại đã được sử dụng', details: { field: 'phone' } }),
    );
    renderWithProviders(<ProfileForm profile={member} />);
    const phone = screen.getByLabelText(/Số điện thoại/);
    fireEvent.change(phone, { target: { value: '0987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(await screen.findByText('Số điện thoại đã được sử dụng')).toBeInTheDocument();
    expect(phone).toHaveAttribute('aria-invalid', 'true');
  });

  test('chỉ gửi trường đã đổi; thành công thì reset form về dữ liệu mới', async () => {
    vi.mocked(api.updateMyProfile).mockResolvedValue({ ...member, displayName: 'Trường Giang' });
    renderWithProviders(<ProfileForm profile={member} />);
    const save = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Họ tên/), { target: { value: 'Trường Giang' } });
    fireEvent.click(save);

    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledWith({ displayName: 'Trường Giang' }));
    await waitFor(() => expect(save).toBeDisabled());
    expect(screen.getByLabelText(/Họ tên/)).toHaveValue('Trường Giang');
    expect(getToasts().some((item) => item.message === 'Đã cập nhật hồ sơ.' && item.tone === 'success')).toBe(true);
  });

  test('xóa trường không bắt buộc thì gửi null', async () => {
    vi.mocked(api.updateMyProfile).mockResolvedValue({ ...coach, coach: { ...coach.coach!, bio: null } });
    renderWithProviders(<ProfileForm profile={coach} />);
    fireEvent.change(screen.getByLabelText(/Giới thiệu/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledWith({ bio: null }));
  });

  test('Member cập nhật mục tiêu tập luyện riêng', async () => {
    const updatedGoal = 'Bơi liên tục 1.000 m sau 3 tháng';
    vi.mocked(api.updateMyProfile).mockResolvedValue({ ...member, member: { ...member.member!, trainingGoal: updatedGoal } });
    renderWithProviders(<ProfileForm profile={member} />);
    fireEvent.change(screen.getByLabelText('Mục tiêu tập luyện'), { target: { value: updatedGoal } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledWith({ trainingGoal: updatedGoal }));
  });
});
