import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { SessionCoachItem, StaffShift } from '../types';
import { MyShiftsPage } from './MyShiftsPage';
import { SessionCoachesPage } from './SessionCoachesPage';

vi.mock('../api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// FR-66/67: dữ liệu mẫu khớp response backend
const coach = (id: number, displayName: string) => ({ id, code: `COA-${id}`, displayName });
const session: SessionCoachItem = {
  id: 11,
  startsAt: '2026-11-12T01:00:00.000Z',
  endsAt: '2026-11-12T02:30:00.000Z',
  status: 'SCHEDULED',
  room: { code: 'R1', name: 'Phòng 1' },
  class: { id: 3, name: 'Yoga sáng', sport: { id: 1, name: 'Yoga' } },
  classCoach: coach(5, 'Coach An'),
  actualCoach: coach(5, 'Coach An'),
  replacedCoach: null,
  coachAbsent: false,
  reason: null,
  changedAt: null,
  changedBy: null,
  attendanceCount: 0,
  canChange: true,
  lockReason: null,
};

const shift: StaffShift = {
  id: 21,
  startsAt: '2026-11-12T01:00:00.000Z',
  endsAt: '2026-11-12T05:00:00.000Z',
  status: 'SCHEDULED',
  note: 'Ca sáng',
  cancelReason: null,
  clockInAt: null,
  clockOutAt: null,
  createdAt: '2026-11-10T00:00:00.000Z',
  staff: { id: 8, displayName: 'Phạm Mai', staffCode: 'REC-01' },
  lateMinutes: 0,
  earlyLeaveMinutes: 0,
  workedMinutes: null,
  attendance: 'NOT_CLOCKED_IN',
  canClockIn: true,
  canClockOut: false,
  editable: true,
  pendingAdjustment: null,
  adjustments: [],
};

describe('FR-66 Dạy thay & coach vắng', () => {
  test('giao dạy thay: chỉ chọn được coach rảnh, gửi đúng dữ liệu', async () => {
    vi.mocked(api.listSessionCoaches).mockResolvedValue([session]);
    vi.mocked(api.listSubstituteCandidates).mockResolvedValue([
      { ...coach(6, 'Coach Bình'), available: true },
      { ...coach(7, 'Coach Chi'), available: false },
    ]);
    vi.mocked(api.assignSubstitute).mockResolvedValue({ ...session, actualCoach: coach(6, 'Coach Bình'), replacedCoach: coach(5, 'Coach An') });
    renderWithProviders(<SessionCoachesPage />);

    expect(await screen.findByText('Yoga sáng')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Giao dạy thay' }));
    const dialog = await screen.findByRole('dialog', { name: 'Giao người dạy thay' });
    const select = within(dialog).getByLabelText(/Coach dạy thay/);
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Coach Chi.*bận/ })).toBeDisabled());

    fireEvent.change(select, { target: { value: '6' } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Coach An nghỉ phép' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao dạy thay' }));

    await waitFor(() => expect(api.assignSubstitute).toHaveBeenCalledWith(11, { coachId: 6, reason: 'Coach An nghỉ phép', coachAbsent: false }));
  });

  test('buổi đã khóa: nút bị vô hiệu và hiện lý do', async () => {
    vi.mocked(api.listSessionCoaches).mockResolvedValue([{ ...session, canChange: false, lockReason: 'Buổi học đã được điểm danh.' }]);
    renderWithProviders(<SessionCoachesPage />);
    expect(await screen.findByText(/Buổi học đã được điểm danh/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giao dạy thay' })).toBeDisabled();
  });

  test('lỗi từ backend hiển thị trong hộp thoại báo vắng', async () => {
    vi.mocked(api.listSessionCoaches).mockResolvedValue([session]);
    vi.mocked(api.markCoachAbsent).mockRejectedValue(axiosError(409, { code: 'SESSION_COACH_LOCKED', message: 'Không thể đổi coach của buổi này: Buổi học đã bị hủy.' }));
    renderWithProviders(<SessionCoachesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Báo coach vắng' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Lý do vắng/), { target: { value: 'Ốm đột xuất' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ghi nhận vắng' }));
    expect(await within(dialog).findByText(/Buổi học đã bị hủy/)).toBeInTheDocument();
  });
});

describe('FR-67 Ca làm của tôi', () => {
  test('hiện ca, tổng hợp và bấm Vào ca', async () => {
    vi.mocked(api.listMyShifts).mockResolvedValue({
      items: [shift],
      summary: { scheduled: 1, completed: 0, absent: 0, lateCount: 0, earlyLeaveCount: 0, workedMinutes: 0 },
    });
    vi.mocked(api.clockIn).mockResolvedValue({ ...shift, clockInAt: '2026-11-12T01:02:00.000Z', attendance: 'WORKING' });
    renderWithProviders(<MyShiftsPage />);

    expect(await screen.findByText('Ca sáng')).toBeInTheDocument();
    expect(screen.getByText('Chưa vào ca')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vào ca' }));
    await waitFor(() => expect(api.clockIn).toHaveBeenCalledWith(21));
  });

  test('xin sửa công: bắt buộc đổi giờ và có lý do, gửi giờ ISO', async () => {
    vi.mocked(api.listMyShifts).mockResolvedValue({
      items: [{ ...shift, canClockIn: false, attendance: 'ABSENT' }],
      summary: { scheduled: 1, completed: 0, absent: 1, lateCount: 0, earlyLeaveCount: 0, workedMinutes: 0 },
    });
    vi.mocked(api.requestAdjustment).mockResolvedValue(shift);
    renderWithProviders(<MyShiftsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Xin sửa công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xin sửa công' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    expect(await within(dialog).findByText('Hãy đổi giờ vào hoặc giờ ra muốn sửa.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Giờ vào đúng'), { target: { value: '2026-11-12T08:00' } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Máy chấm công hỏng' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    await waitFor(() =>
      expect(api.requestAdjustment).toHaveBeenCalledWith(21, { clockInAt: '2026-11-12T01:00:00.000Z', reason: 'Máy chấm công hỏng' }),
    );
  });
});
