import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { loginAs } from '../../users/testing/session';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { axiosError } from '../../training/testing/axiosError';
import * as bookingApi from '../bookingApi';
import * as usersApi from '../../users/api';
import { GroupClassBookingDetailPage } from './GroupClassBookingDetailPage';

vi.mock('../bookingApi');
vi.mock('../../users/api');

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
    registrationCloseAt: '2026-11-30T00:00:00.000Z',
    startDate: '2026-12-01T00:00:00.000Z',
    endDate: '2027-01-01T00:00:00.000Z',
    status: 'OPEN' as const,
    sport: { id: 2, name: 'Bơi lội', isActive: true },
    coach: { user: { id: 12, displayName: 'Coach An' } },
    _count: { registrations: 4 },
    confirmedCount: 4,
    remainingSeats: 8,
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

test('shows detail and submits registration for authenticated Member', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getPublicClass).mockResolvedValue(classDetail());
  vi.mocked(bookingApi.registerForClass).mockResolvedValue({
    orderId: 102,
    orderNumber: 'ORD-GC-102',
    amount: 500000,
    expiresAt: '2026-11-01T10:00:00.000Z',
    registrationId: 55,
    status: 'PENDING_PAYMENT',
  });
  renderWithProviders(<GroupClassBookingDetailPage />, { path: '/member/classes/:classId', route: '/member/classes/8' });

  expect(await screen.findByText('Bơi cơ bản')).toBeInTheDocument();
  expect(screen.getByText('Hồ bơi 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký lớp' }));
  const dialog = screen.getByRole('dialog', { name: 'Xác nhận đăng ký' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đăng ký' }));
  await waitFor(() => expect(bookingApi.registerForClass).toHaveBeenCalledWith(8));
  expect(await screen.findByRole('dialog', { name: 'Đã tạo đơn đăng ký' })).toBeInTheDocument();
  expect(screen.getByText('ORD-GC-102')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute('href', '/member/payments?orderId=102');
});

test('keeps API conflict visible and does not retry registration automatically', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getPublicClass).mockResolvedValue(classDetail());
  vi.mocked(bookingApi.registerForClass).mockRejectedValue(
    axiosError(409, { code: 'CLASS_FULL', message: 'Lớp học đã hết chỗ.' }),
  );
  renderWithProviders(<GroupClassBookingDetailPage />, { path: '/member/classes/:classId', route: '/member/classes/8' });
  await screen.findByText('Bơi cơ bản');
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký lớp' }));
  const confirm = screen.getByRole('dialog', { name: 'Xác nhận đăng ký' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Xác nhận đăng ký' }));
  expect(await screen.findByText('Lớp học đã hết chỗ.')).toBeInTheDocument();
  expect(bookingApi.registerForClass).toHaveBeenCalledTimes(1);
});

test('allows an active Member to join the waitlist when the class is full', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getPublicClass).mockResolvedValue({ ...classDetail(), remainingSeats: 0 });
  vi.mocked(bookingApi.joinClassWaitlist).mockResolvedValue({
    id: 21, classId: 8, memberId: 17, status: 'WAITING', joinedAt: '2026-10-27T16:00:00.000Z', offeredAt: null, offerExpiresAt: null,
  });
  renderWithProviders(<GroupClassBookingDetailPage />, { path: '/member/classes/:classId', route: '/member/classes/8' });
  await screen.findByText('Bơi cơ bản');
  fireEvent.click(screen.getByRole('button', { name: 'Vào danh sách chờ' }));
  expect(await screen.findByText('Đã vào danh sách chờ (đang chờ).')).toBeInTheDocument();
  expect(bookingApi.joinClassWaitlist).toHaveBeenCalledWith(8);
});

test('lets Receptionist create a pending registration for a Member selected from the user API', async () => {
  loginAs('RECEPTIONIST');
  vi.mocked(bookingApi.getPublicClass).mockResolvedValue(classDetail());
  vi.mocked(bookingApi.registerMemberOnBehalf).mockResolvedValue({
    orderId: 103, orderNumber: 'ORD-GC-103', amount: 500000, expiresAt: '2026-11-01T10:00:00.000Z', registrationId: 56, status: 'PENDING_PAYMENT',
  });
  vi.mocked(usersApi.listUsers).mockResolvedValue({
    items: [{ id: 17, email: 'member@example.test', phone: null, displayName: 'Hội viên An', role: 'MEMBER', status: 'ACTIVE', code: 'MBR-17', emailVerified: true, createdAt: '2026-01-01T00:00:00.000Z' }],
    page: 1, pageSize: 10, total: 1,
  });
  renderWithProviders(<GroupClassBookingDetailPage />, { path: '/app/class-bookings/:classId', route: '/app/class-bookings/8' });
  await screen.findByText('Bơi cơ bản');
  expect(screen.getByRole('link', { name: /Danh sách lớp/ })).toHaveAttribute('href', '/app/class-bookings');
  expect(screen.queryByRole('button', { name: 'Đăng ký lớp' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký hộ hội viên' }));
  const dialog = screen.getByRole('dialog', { name: 'Đăng ký lớp cho hội viên' });
  fireEvent.change(await within(dialog).findByLabelText(/Hội viên/), { target: { value: '17' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo đơn chờ thanh toán' }));
  expect(await within(dialog).findByText('ORD-GC-103')).toBeInTheDocument();
  expect(bookingApi.registerMemberOnBehalf).toHaveBeenCalledWith(8, 17);
});

test('requires confirmation and reports backend result when cancelling a registration', async () => {
  loginAs('MEMBER');
  vi.mocked(bookingApi.getPublicClass).mockResolvedValue(classDetail());
  vi.mocked(bookingApi.registerForClass).mockResolvedValue({
    orderId: 104, orderNumber: 'ORD-GC-104', amount: 500000, expiresAt: '2026-11-01T10:00:00.000Z', registrationId: 57, status: 'PENDING_PAYMENT',
  });
  vi.mocked(bookingApi.cancelClassRegistration).mockResolvedValue({ status: 'CANCELLED' });
  renderWithProviders(<GroupClassBookingDetailPage />, { path: '/member/classes/:classId', route: '/member/classes/8' });
  await screen.findByText('Bơi cơ bản');
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký lớp' }));
  const registrationDialog = screen.getByRole('dialog', { name: 'Xác nhận đăng ký' });
  fireEvent.click(within(registrationDialog).getByRole('button', { name: 'Xác nhận đăng ký' }));
  await within(registrationDialog).findByText('ORD-GC-104');
  fireEvent.click(within(registrationDialog).getByRole('button', { name: 'Hủy đăng ký' }));
  const confirmDialog = screen.getByRole('dialog', { name: 'Xác nhận hủy đăng ký' });
  fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Hủy đăng ký' }));
  expect(await within(registrationDialog).findByText('Đã gửi yêu cầu hủy đăng ký')).toBeInTheDocument();
  expect(bookingApi.cancelClassRegistration).toHaveBeenCalledWith(57);
});
