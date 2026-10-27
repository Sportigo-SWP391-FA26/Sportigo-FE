import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { axiosError } from '../../training/testing/axiosError';
import * as coachApi from '../../coaches/api';
import * as catalogApi from '../../catalog/api';
import * as trainingApi from '../../training/api';
import * as api from '../api';
import type { GroupClass, ClassSession } from '../types';
import { GroupClassDetailPage } from './GroupClassDetailPage';

vi.mock('../api');
vi.mock('../../coaches/api');
vi.mock('../../catalog/api');
vi.mock('../../training/api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const groupClass: GroupClass = {
  id: 5,
  sportId: 2,
  coachId: 8,
  name: 'Lớp cầu lông cơ bản',
  description: 'Mô tả lớp hiện tại',
  capacity: 12,
  tuitionFee: '500000',
  registrationOpenAt: '2030-01-01T03:00:00.000Z',
  registrationCloseAt: '2030-01-03T03:00:00.000Z',
  startDate: '2030-01-10T00:00:00.000Z',
  endDate: '2030-03-10T00:00:00.000Z',
  status: 'OPEN',
  createdAt: '2029-12-01T00:00:00.000Z',
  updatedAt: '2029-12-01T00:00:00.000Z',
  sport: { id: 2, name: 'Cầu lông', isActive: true },
  coach: { user: { id: 8, displayName: 'Coach An' } },
};

const session: ClassSession = {
  id: 21,
  classId: 5,
  roomId: 3,
  startsAt: '2030-02-01T03:00:00.000Z',
  endsAt: '2030-02-01T04:00:00.000Z',
  note: null,
  status: 'SCHEDULED',
  room: { id: 3, code: 'R3', name: 'Sân 3' },
};

async function openDetail() {
  vi.mocked(api.getGroupClasses).mockResolvedValue([groupClass]);
  vi.mocked(api.getGroupClassSessions).mockResolvedValue([session]);
  vi.mocked(trainingApi.getSports).mockResolvedValue([{ id: 2, name: 'Cầu lông', isActive: true }]);
  vi.mocked(coachApi.getCoaches).mockResolvedValue([{
    id: 8,
    email: 'coach@sportigo.vn',
    phone: null,
    displayName: 'Coach An',
    role: 'COACH',
    status: 'ACTIVE',
    emailVerified: true,
    staffCode: 'COA-08',
    hiredAt: null,
    bio: null,
    coachStatus: 'ACTIVE',
    createdAt: '2029-01-01T00:00:00.000Z',
  }]);
  vi.mocked(catalogApi.getRooms).mockResolvedValue([{ id: 3, code: 'R3', name: 'Sân 3', capacity: 20, location: null, status: 'AVAILABLE' }]);
  return renderWithProviders(<GroupClassDetailPage />, { path: '/app/classes/:classId', route: '/app/classes/5' });
}

test('hydrates all editable values and does not expose status in the edit form', async () => {
  await openDetail();
  await screen.findByText('Lớp cầu lông cơ bản');
  fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin lớp' }));
  const dialog = await screen.findByRole('dialog', { name: 'Sửa thông tin lớp' });
  await within(dialog).findByRole('option', { name: 'Cầu lông' });

  expect(within(dialog).getByLabelText(/Môn thể thao/)).toHaveValue('2');
  expect(within(dialog).getByLabelText(/Coach/)).toHaveValue('8');
  expect(within(dialog).getByLabelText(/Tên lớp/)).toHaveValue('Lớp cầu lông cơ bản');
  expect(within(dialog).getByLabelText('Mô tả')).toHaveValue('Mô tả lớp hiện tại');
  expect(within(dialog).getByLabelText(/Sức chứa/)).toHaveValue(12);
  expect(within(dialog).getByLabelText(/Mở đăng ký/)).toHaveValue('2030-01-01T10:00');
  expect(within(dialog).queryByLabelText(/trạng thái/i)).not.toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
  await waitFor(() => expect(api.updateGroupClass).toHaveBeenCalledWith(5, expect.objectContaining({
    sportId: 2,
    coachId: 8,
    capacity: 12,
    registrationOpenAt: '2030-01-01T03:00:00.000Z',
  })));
  expect(vi.mocked(api.updateGroupClass).mock.calls[0]?.[1]).not.toHaveProperty('status');
});

test('cancels one ClassSession with a required reason and refreshes the session list', async () => {
  await openDetail();
  await screen.findByText('Sân 3');
  vi.mocked(api.getGroupClassSessions).mockResolvedValue([
    { ...session, status: 'CANCELLED' },
  ]);
  vi.mocked(api.cancelClassSession).mockResolvedValue({ ...session, status: 'CANCELLED' });
  fireEvent.click(screen.getByRole('button', { name: 'Hủy buổi học' }));
  const dialog = screen.getByRole('dialog', { name: 'Hủy riêng buổi học' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy buổi' }));
  expect(await within(dialog).findByText('Vui lòng nhập lý do hủy.')).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText(/Lý do hủy/), { target: { value: 'Coach nghỉ ốm' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy buổi' }));
  await waitFor(() => expect(api.cancelClassSession).toHaveBeenCalledWith(21, 'Coach nghỉ ốm'));
  expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
});

test('keeps the edited capacity and displays the backend held-seat conflict', async () => {
  await openDetail();
  await screen.findByText('Lớp cầu lông cơ bản');
  vi.mocked(api.updateGroupClass).mockRejectedValue(
    axiosError(409, { code: 'CLASS_CAPACITY_BELOW_OCCUPANCY', message: 'Sức chứa không thể thấp hơn số chỗ đã giữ.' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin lớp' }));
  const dialog = await screen.findByRole('dialog', { name: 'Sửa thông tin lớp' });
  await within(dialog).findByRole('option', { name: 'Cầu lông' });
  fireEvent.change(within(dialog).getByLabelText(/Sức chứa/), { target: { value: '1' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));

  expect(await within(dialog).findByText('Sức chứa không thể thấp hơn số chỗ đã giữ.')).toBeInTheDocument();
  expect(within(dialog).getByLabelText(/Sức chứa/)).toHaveValue(1);
});

test('requires a valid time range before creating a single session', async () => {
  await openDetail();
  await screen.findByText('Sân 3');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm buổi' }));
  const dialog = screen.getByRole('dialog', { name: 'Thêm buổi học' });
  await within(dialog).findByRole('option', { name: /Sân 3/ });
  fireEvent.change(within(dialog).getByLabelText(/Phòng học/), { target: { value: '3' } });
  fireEvent.change(within(dialog).getByLabelText(/Giờ bắt đầu/), { target: { value: '2030-02-01T11:00' } });
  fireEvent.change(within(dialog).getByLabelText(/Giờ kết thúc/), { target: { value: '2030-02-01T10:00' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo buổi học' }));
  expect(await within(dialog).findByText('Giờ kết thúc phải sau giờ bắt đầu.')).toBeInTheDocument();
  expect(api.createClassSession).not.toHaveBeenCalled();
});

test('changes one session and omits newRoomId when keeping its current room', async () => {
  await openDetail();
  await screen.findByText('Sân 3');
  vi.mocked(api.changeClassSession).mockResolvedValue(session);
  fireEvent.click(screen.getByRole('button', { name: 'Đổi lịch' }));
  const dialog = screen.getByRole('dialog', { name: 'Đổi lịch buổi học' });
  await within(dialog).findByRole('option', { name: 'Sân 3' });
  fireEvent.change(within(dialog).getByLabelText(/Lý do đổi lịch/), { target: { value: 'Phòng cần bảo trì' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu lịch mới' }));
  await waitFor(() => expect(api.changeClassSession).toHaveBeenCalledWith(21, {
    newStartsAt: '2030-02-01T03:00:00.000Z',
    reason: 'Phòng cần bảo trì',
  }));
  expect(vi.mocked(api.changeClassSession).mock.calls[0]?.[1]).not.toHaveProperty('newRoomId');
});

test('exposes class registration status changes through the dedicated API', async () => {
  await openDetail();
  await screen.findByText('Lớp cầu lông cơ bản');
  vi.mocked(api.updateGroupClassStatus).mockResolvedValue({ ...groupClass, status: 'CLOSED' });
  fireEvent.click(screen.getByRole('button', { name: 'Đóng đăng ký' }));
  await waitFor(() => expect(api.updateGroupClassStatus).toHaveBeenCalledWith(5, 'CLOSED'));
});
