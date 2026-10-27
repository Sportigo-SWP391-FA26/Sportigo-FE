import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { axiosError } from '../../training/testing/axiosError';
import * as api from '../api';
import type { PrivateEnrollment } from '../types';
import { MemberPrivateSchedulePage } from './MemberPrivateSchedulePage';

vi.mock('../api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function enrollment(): PrivateEnrollment {
  const start = '2030-01-01';
  return {
    id: 31,
    memberId: 7,
    coachId: 12,
    privateCourseId: 9,
    purchasedSessions: 24,
    remainingSessions: 24,
    purchasedPrice: 1200000,
    startDate: start,
    expiryDate: '2030-12-31',
    status: 'ACTIVE',
    member: { userId: 7, memberCode: 'MEM-07' },
    coach: { user: { id: 12, displayName: 'Coach An' } },
    privateCourse: { id: 9, name: 'Bơi cơ bản', sport: { id: 2, name: 'Bơi lội', isActive: true } },
    schedules: [{
      id: 44,
      enrollmentId: 31,
      roomId: 4,
      dayOfWeek: new Date(`${start}T00:00:00Z`).getUTCDay(),
      startTime: '1970-01-01T10:00:00.000Z',
      endTime: '1970-01-01T11:00:00.000Z',
      effectiveFrom: start,
      effectiveTo: '2030-12-31',
      status: 'ACTIVE',
    }],
  };
}

test('shows loading and empty states from the enrollment API', async () => {
  let resolve!: (value: PrivateEnrollment[]) => void;
  vi.mocked(api.getMyPrivateEnrollments).mockReturnValue(new Promise((done) => { resolve = done; }));
  renderWithProviders(<MemberPrivateSchedulePage />);
  expect(screen.getByText('Đang tải lịch khóa học…')).toBeInTheDocument();

  resolve([]);
  expect(await screen.findByText('Không có occurrence sắp tới')).toBeInTheDocument();
});

test('shows authorization errors from GET enrollments', async () => {
  vi.mocked(api.getMyPrivateEnrollments).mockRejectedValue(
    axiosError(403, { code: 'FORBIDDEN', message: 'Bạn không có quyền xem lịch này.' }),
  );
  renderWithProviders(<MemberPrivateSchedulePage />);
  expect(await screen.findByText('Bạn không có quyền xem nội dung này')).toBeInTheDocument();
});

describe('FR63 single occurrence update', () => {
  test('sends a reschedule reason and start time without a room override, then updates just that occurrence', async () => {
    vi.mocked(api.getMyPrivateEnrollments).mockResolvedValue([enrollment()]);
    vi.mocked(api.changePrivateOccurrence).mockResolvedValue({
      id: 91,
      scheduleId: 44,
      sessionDate: '2030-01-01',
      action: 'RESCHEDULED',
      rescheduledStartsAt: '2030-01-10T02:00:00.000Z',
      rescheduledEndsAt: '2030-01-10T03:00:00.000Z',
      newRoomId: null,
      reason: 'Có lịch khác',
    });
    renderWithProviders(<MemberPrivateSchedulePage />);
    await screen.findByRole('heading', { name: 'Lịch khóa học 1–1 của tôi' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Đổi / hủy buổi này' })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Thay đổi một buổi học' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Đổi lịch buổi' }));
    fireEvent.change(within(dialog).getByLabelText(/Giờ bắt đầu mới/), { target: { value: '2030-01-10T09:00' } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Có lịch khác' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đổi buổi' }));

    await waitFor(() => expect(api.changePrivateOccurrence).toHaveBeenCalledWith(
      31,
      44,
      '2030-01-01',
      { action: 'RESCHEDULED', newStartsAt: '2030-01-10T02:00:00.000Z', reason: 'Có lịch khác' },
    ));
    expect(await screen.findByText('Đã đổi lịch')).toBeInTheDocument();
    expect(vi.mocked(api.changePrivateOccurrence).mock.calls[0]?.[3]).not.toHaveProperty('newRoomId');
  });

  test('requires a cancellation reason and preserves the dialog without sending a request', async () => {
    vi.mocked(api.getMyPrivateEnrollments).mockResolvedValue([enrollment()]);
    renderWithProviders(<MemberPrivateSchedulePage />);
    await screen.findByRole('heading', { name: 'Lịch khóa học 1–1 của tôi' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Đổi / hủy buổi này' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy buổi' }));

    expect(await screen.findByText('Vui lòng nhập lý do.')).toBeInTheDocument();
    expect(api.changePrivateOccurrence).not.toHaveBeenCalled();
  });

  test('keeps entered data and displays backend cutoff/conflict errors', async () => {
    vi.mocked(api.getMyPrivateEnrollments).mockResolvedValue([enrollment()]);
    vi.mocked(api.changePrivateOccurrence).mockRejectedValue(
      axiosError(409, { code: 'PRIVATE_SESSION_CANCELLATION_CUTOFF', message: 'Chỉ được đổi hoặc hủy buổi học trước ít nhất 24 giờ.' }),
    );
    renderWithProviders(<MemberPrivateSchedulePage />);
    await screen.findByRole('heading', { name: 'Lịch khóa học 1–1 của tôi' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Đổi / hủy buổi này' })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Thay đổi một buổi học' });
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Lịch phát sinh' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy buổi' }));

    expect(await within(dialog).findByText('Chỉ được đổi hoặc hủy buổi học trước ít nhất 24 giờ.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Lý do/)).toHaveValue('Lịch phát sinh');
  });
});
