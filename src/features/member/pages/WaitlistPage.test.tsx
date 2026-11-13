import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { loginAs } from '../../users/testing/session';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as bookingApi from '../bookingApi';
import * as groupClassApi from '../../group-classes/api';
import { WaitlistPage } from './WaitlistPage';

vi.mock('../bookingApi');
vi.mock('../../group-classes/api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

function classDetail() {
  return {
    id: 8,
    sportId: 2,
    coachId: 12,
    name: 'Bơi cơ bản',
    description: 'Mô tả lớp',
    capacity: 12,
    tuitionFee: 500000,
    registrationOpenAt: '2026-10-01T00:00:00.000Z',
    registrationCloseAt: '2026-12-01T00:00:00.000Z',
    startDate: '2026-12-02T00:00:00.000Z',
    endDate: '2027-01-01T00:00:00.000Z',
    status: 'OPEN' as const,
    sport: { id: 2, name: 'Bơi lội', isActive: true },
    coach: { user: { id: 12, displayName: 'Coach An' } },
    _count: { registrations: 12 },
    confirmedCount: 12,
    remainingSeats: 0,
    sessions: [{
      id: 19,
      startsAt: '2026-12-03T02:00:00.000Z',
      endsAt: '2026-12-03T03:00:00.000Z',
      status: 'SCHEDULED' as const,
      note: null,
      room: { id: 3, code: 'POOL-1', name: 'Hồ bơi 1', location: null },
    }],
  };
}

function waitlistRecord(status: 'WAITING' | 'OFFERED' | 'ACCEPTED' = 'WAITING') {
  return {
    id: 21,
    memberId: 17,
    classId: 8,
    status,
    joinedAt: '2026-11-06T09:00:00.000Z',
    offeredAt: status === 'OFFERED' ? '2026-11-06T10:00:00.000Z' : null,
    offerExpiresAt: status === 'OFFERED' ? '2026-11-06T12:00:00.000Z' : null,
    groupClass: { id: 8, name: 'Bơi cơ bản', status: 'OPEN', capacity: 12 },
    member: { user: { id: 17, displayName: 'Hội viên An', email: 'member@example.test' } },
    invitations: status === 'OFFERED' ? [{
      id: 41,
      waitlistId: 21,
      status: 'OFFERED' as const,
      offeredAt: '2026-11-06T10:00:00.000Z',
      expiresAt: '2026-11-06T12:00:00.000Z',
      respondedAt: null,
      orderId: null,
      failureReason: null,
      order: null,
    }] : [],
  };
}

test('Member joins a full open class using the existing waitlist API', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getMyWaitlists).mockResolvedValue([]);
  vi.mocked(bookingApi.getPublicClasses).mockResolvedValue({
    data: [classDetail()],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
  vi.mocked(bookingApi.getPublicClass).mockResolvedValue(classDetail());
  vi.mocked(bookingApi.joinClassWaitlist).mockResolvedValue(waitlistRecord());

  renderWithProviders(<WaitlistPage />, { path: '/waitlist', route: '/waitlist' });

  expect(await screen.findByText('Bơi cơ bản')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Join Waitlist' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Đã tham gia danh sách chờ.');
  expect(bookingApi.joinClassWaitlist).toHaveBeenCalledWith(8);
});

test('Member accepts an invitation and continues to the existing payment route', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getMyWaitlists).mockResolvedValue([waitlistRecord('OFFERED')]);
  vi.mocked(bookingApi.respondToClassWaitlist).mockResolvedValue({
    waitlist: waitlistRecord('ACCEPTED'),
    order: { id: 102, orderNumber: 'ORD-WL-102', status: 'PENDING_PAYMENT', finalAmount: 500000, expiresAt: '2026-11-06T12:00:00.000Z' },
  });

  const { router } = renderWithProviders(<WaitlistPage />, { path: '/waitlist', route: '/waitlist' });
  fireEvent.click(await screen.findByRole('tab', { name: 'Lời mời của tôi' }));
  fireEvent.click(await screen.findByRole('button', { name: 'ACCEPT' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nhận lời' }));

  await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe('/member/payments?orderId=102'));
  expect(bookingApi.respondToClassWaitlist).toHaveBeenCalledWith(8, true);
});

test('Member declines an invitation through the existing response API', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getMyWaitlists)
    .mockResolvedValueOnce([waitlistRecord('OFFERED')])
    .mockResolvedValue([]);
  vi.mocked(bookingApi.respondToClassWaitlist).mockResolvedValue({
    waitlist: waitlistRecord('ACCEPTED'),
    order: null,
  });

  renderWithProviders(<WaitlistPage />, { path: '/waitlist', route: '/waitlist' });
  fireEvent.click(await screen.findByRole('tab', { name: 'Lời mời của tôi' }));
  fireEvent.click(await screen.findByRole('button', { name: 'DECLINE' }));
  fireEvent.click(screen.getByRole('button', { name: 'Từ chối lời mời' }));

  await waitFor(() => expect(bookingApi.respondToClassWaitlist).toHaveBeenCalledWith(8, false));
  expect(await screen.findByText('Chưa có lời mời mới')).toBeInTheDocument();
});

test('Center Manager sees live waitlist records and summary without mutation controls', async () => {
  loginAs('CENTER_MANAGER');
  vi.mocked(bookingApi.getWaitlists).mockResolvedValue({
    items: [waitlistRecord()],
    page: 1,
    limit: 10,
    total: 1,
  });
  vi.mocked(groupClassApi.getGroupClasses).mockResolvedValue([]);

  renderWithProviders(<WaitlistPage />, { path: '/waitlist', route: '/waitlist' });

  expect(await screen.findByRole('heading', { name: 'Quản lý Waitlist' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Danh sách chờ' }));
  expect(await screen.findByText('Hội viên An')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Join Waitlist' })).not.toBeInTheDocument();
  expect(bookingApi.getWaitlists).toHaveBeenCalled();
});

test('Center Manager can search Member names across the paginated results', async () => {
  loginAs('CENTER_MANAGER');
  const secondRecord = {
    ...waitlistRecord(),
    id: 22,
    memberId: 18,
    member: { user: { id: 18, displayName: 'Hội viên Bình', email: 'member2@example.test' } },
  };
  vi.mocked(bookingApi.getWaitlists).mockResolvedValue({
    items: [waitlistRecord(), secondRecord],
    page: 1,
    limit: 10,
    total: 2,
  });
  vi.mocked(groupClassApi.getGroupClasses).mockResolvedValue([]);

  renderWithProviders(<WaitlistPage />, { path: '/waitlist', route: '/waitlist' });
  fireEvent.click(await screen.findByRole('tab', { name: 'Danh sách chờ' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Tìm Member hoặc lớp' }), { target: { value: 'Hội viên Bình' } });

  expect(await screen.findByText('Hội viên Bình')).toBeInTheDocument();
  expect(screen.queryByText('Hội viên An')).not.toBeInTheDocument();
});
