import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getToasts } from '../../../components/feedback/toast';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as usersApi from '../../users/api';
import { loginAs } from '../../users/testing/session';
import * as api from '../api';
import type { StaffListPage, StaffMember } from '../types';
import { StaffPage } from './StaffPage';

vi.mock('../api');
vi.mock('../../users/api');

const coach: StaffMember = {
  id: 7,
  email: 'lan@sportigo.vn',
  phone: '0901234567',
  displayName: 'Lê Lan',
  role: 'COACH',
  status: 'ACTIVE',
  emailVerified: true,
  staffCode: 'COA-07',
  hiredAt: '2026-10-01',
  bio: null,
  coachStatus: 'ACTIVE',
  createdAt: '2026-10-01T00:00:00.000Z',
};
const receptionist: StaffMember = {
  ...coach,
  id: 8,
  email: 'mai@sportigo.vn',
  displayName: 'Phạm Mai',
  role: 'RECEPTIONIST',
  staffCode: 'REC-01',
  hiredAt: null,
  coachStatus: null,
  status: 'LOCKED',
};
const list: StaffListPage = { items: [coach, receptionist], page: 1, pageSize: 20, total: 2 };

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

async function openPage() {
  loginAs('CENTER_MANAGER');
  vi.mocked(api.listStaff).mockResolvedValue(list);
  renderWithProviders(<StaffPage />);
  await screen.findByText('Lê Lan');
}

async function openCreateForm() {
  await openPage();
  fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân sự' }));
  return screen.findByRole('dialog', { name: 'Thêm nhân sự' });
}

function fill(dialog: HTMLElement, label: RegExp, value: string) {
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
}

describe('Quản lý nhân sự (FR-07)', () => {
  test('hiển thị danh sách với mã, ngày vào làm và trạng thái tài khoản', async () => {
    await openPage();
    expect(screen.getByText('COA-07')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Đã khóa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở khóa Phạm Mai' })).toBeInTheDocument();
  });

  test('tạo Coach: kiểm tra dữ liệu rồi gửi đúng body', async () => {
    vi.mocked(api.createStaff).mockResolvedValue({ ...coach, id: 9, displayName: 'Ngô Huy', email: 'huy@sportigo.vn', emailSent: true });
    const dialog = await openCreateForm();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await within(dialog).findByText('Email không hợp lệ')).toBeInTheDocument();
    expect(api.createStaff).not.toHaveBeenCalled();

    fill(dialog, /Mã nhân sự/, 'coa-09');
    fill(dialog, /Họ tên/, 'Ngô Huy');
    fill(dialog, /Email/, 'Huy@Sportigo.vn');
    fill(dialog, /Số điện thoại/, '0912345678');
    fill(dialog, /Mật khẩu ban đầu/, 'matkhau123');
    fill(dialog, /Giới thiệu/, 'HLV bơi');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() =>
      expect(api.createStaff).toHaveBeenCalledWith({
        role: 'COACH',
        staffCode: 'coa-09',
        displayName: 'Ngô Huy',
        email: 'huy@sportigo.vn',
        phone: '0912345678',
        password: 'matkhau123',
        bio: 'HLV bơi',
      }),
    );
    expect(getToasts().some((item) => item.message.includes('Mã kích hoạt đã gửi tới huy@sportigo.vn'))).toBe(true);
  });

  test('chọn Receptionist thì ẩn ô giới thiệu', async () => {
    const dialog = await openCreateForm();
    expect(within(dialog).getByLabelText(/Giới thiệu/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Vai trò/), { target: { value: 'RECEPTIONIST' } });
    expect(within(dialog).queryByLabelText(/Giới thiệu/)).not.toBeInTheDocument();
  });

  test('mã nhân sự trùng hiện lỗi ngay dưới ô mã', async () => {
    vi.mocked(api.createStaff).mockRejectedValue(axiosError(409, { code: 'STAFF_CODE_EXISTS', message: 'Mã nhân sự đã tồn tại' }));
    const dialog = await openCreateForm();
    fill(dialog, /Mã nhân sự/, 'COA-07');
    fill(dialog, /Họ tên/, 'Ngô Huy');
    fill(dialog, /Email/, 'huy@sportigo.vn');
    fill(dialog, /Số điện thoại/, '0912345678');
    fill(dialog, /Mật khẩu ban đầu/, 'matkhau123');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByText('Mã nhân sự đã tồn tại')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Mã nhân sự/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('email trùng gắn lỗi vào ô email', async () => {
    vi.mocked(api.createStaff).mockRejectedValue(
      axiosError(409, { code: 'ACCOUNT_EXISTS', message: 'Email đã được sử dụng', details: { field: 'email' } }),
    );
    const dialog = await openCreateForm();
    fill(dialog, /Mã nhân sự/, 'COA-10');
    fill(dialog, /Họ tên/, 'Ngô Huy');
    fill(dialog, /Email/, 'lan@sportigo.vn');
    fill(dialog, /Số điện thoại/, '0912345678');
    fill(dialog, /Mật khẩu ban đầu/, 'matkhau123');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByText('Email đã được sử dụng')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('sửa Coach chỉ gửi trường đã đổi, không cho sửa vai trò/email', async () => {
    vi.mocked(api.updateStaff).mockResolvedValue({ ...coach, coachStatus: 'ON_LEAVE' });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Lê Lan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa thông tin nhân sự' });

    expect(within(dialog).getByLabelText(/Email/)).toHaveAttribute('readonly');
    expect(within(dialog).getByLabelText(/Vai trò/)).toHaveAttribute('readonly');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await within(dialog).findByText('Bạn chưa thay đổi thông tin nào.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Tình trạng làm việc/), { target: { value: 'ON_LEAVE' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateStaff).toHaveBeenCalledWith(7, { coachStatus: 'ON_LEAVE' }));
  });

  test('khóa nhân sự dùng lại API khóa tài khoản', async () => {
    vi.mocked(usersApi.changeUserStatus).mockResolvedValue({
      id: 7,
      email: coach.email,
      phone: coach.phone,
      displayName: coach.displayName,
      role: 'COACH',
      status: 'LOCKED',
      code: 'COA-07',
      emailVerified: true,
      createdAt: coach.createdAt,
    });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Khóa Lê Lan' }));
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Nghỉ việc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản' }));
    await waitFor(() => expect(usersApi.changeUserStatus).toHaveBeenCalledWith(7, { status: 'LOCKED', reason: 'Nghỉ việc' }));
  });
});
