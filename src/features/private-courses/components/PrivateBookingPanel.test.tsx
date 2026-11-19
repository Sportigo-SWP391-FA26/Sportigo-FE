import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import * as bookingApi from '../../member/bookingApi';
import type { PrivateCourse } from '../types';
import { PrivateBookingPanel } from './PrivateBookingPanel';

vi.mock('../api');
vi.mock('../../member/bookingApi');
afterEach(() => { cleanup(); vi.resetAllMocks(); });

test('member chooses a Coach and a standard shift before booking', async () => {
  vi.mocked(api.getMyPrivateEnrollments).mockResolvedValue([]);
  vi.mocked(bookingApi.getMyClassRegistrations).mockResolvedValue([]);
  vi.mocked(api.previewPrivateBooking).mockResolvedValue({ coachId: 12, startDate: '2030-01-01', expiryDate: '2030-02-01', price: 1000000, totalSessions: 2, occurrences: [
    { startsAt: '2030-01-01T02:00:00.000Z', endsAt: '2030-01-01T03:00:00.000Z', roomId: 1, shiftCode: 'S2' },
    { startsAt: '2030-01-08T02:00:00.000Z', endsAt: '2030-01-08T03:00:00.000Z', roomId: 1, shiftCode: 'S2' },
  ] });
  const course = { id: 9, status: 'ACTIVE', totalSessions: 2, sessionDurationMinutes: 60, validityDays: 30, coaches: [{ coachId: 12, isActive: true, coach: { user: { displayName: 'Coach An' }, availabilities: [{ dayOfWeek: 2, startTime: '1970-01-01T09:00:00.000Z', endTime: '1970-01-01T10:30:00.000Z', effectiveFrom: '2030-01-01', effectiveTo: null, status: 'AVAILABLE' }] } }] } as PrivateCourse;
  renderWithProviders(<PrivateBookingPanel course={course} />);
  fireEvent.change(screen.getByLabelText('Coach'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Bắt đầu từ'), { target: { value: '2030-01-01' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xem trước lịch học' })).toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Chọn ca' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xem trước lịch học' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước lịch học' }));
  expect(await screen.findByText(/Lịch dự kiến · 2 buổi/)).toBeInTheDocument();
  expect(api.previewPrivateBooking).toHaveBeenCalledWith(9, { coachId: 12, startDate: '2030-01-01', schedules: [{ dayOfWeek: 2, shiftCode: 'S2' }] });
});

test('shows a red shift and the conflicting class name before booking', async () => {
  vi.mocked(api.getMyPrivateEnrollments).mockResolvedValue([]);
  vi.mocked(bookingApi.getMyClassRegistrations).mockResolvedValue([{ status: 'CONFIRMED', classId: 5, groupClass: { name: 'Yoga phục hồi', sessions: [{ id: 1, startsAt: '2030-01-08T02:30:00.000Z', endsAt: '2030-01-08T03:30:00.000Z', status: 'SCHEDULED' }] } }] as never);
  const course = { id: 9, status: 'ACTIVE', totalSessions: 2, sessionDurationMinutes: 60, validityDays: 30, coaches: [{ coachId: 12, isActive: true, coach: { user: { displayName: 'Coach An' }, availabilities: [{ dayOfWeek: 2, startTime: '1970-01-01T09:00:00.000Z', endTime: '1970-01-01T10:30:00.000Z', effectiveFrom: '2030-01-01', effectiveTo: null, status: 'AVAILABLE' }] } }] } as PrivateCourse;
  renderWithProviders(<PrivateBookingPanel course={course} />);
  fireEvent.change(screen.getByLabelText('Coach'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Bắt đầu từ'), { target: { value: '2030-01-01' } });
  const conflict = await screen.findByRole('button', { name: /Trùng lịch Yoga phục hồi ngày 2030-01-08/ });
  expect(conflict).toBeDisabled();
  expect(screen.getByRole('note')).toHaveTextContent('Yoga phục hồi');
});
