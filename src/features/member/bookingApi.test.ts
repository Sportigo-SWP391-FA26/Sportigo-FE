import { afterEach, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { cancelClassRegistration, getMyClassRegistrations, getMyWaitlists, getPublicClass, getPublicClasses, getWaitlistHistory, getWaitlists, joinClassWaitlist, registerForClass, registerMemberOnBehalf, respondToClassWaitlist } from './bookingApi';

afterEach(() => vi.restoreAllMocks());

test('sends supported public listing filters and pagination', async () => {
  const result = { data: [], pagination: { page: 2, limit: 10, total: 14, totalPages: 2 } };
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: result } });
  const filters = { page: 2, limit: 10, sportId: 3, coachId: 8, date: '2026-11-15' };
  expect(await getPublicClasses(filters)).toEqual(result);
  expect(get).toHaveBeenCalledWith('/bookings/classes', { params: filters });
});

test('loads public class detail and registers without client-supplied member identity', async () => {
  const detail = { id: 8, name: 'Bơi cơ bản', remainingSeats: 2 };
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: detail } });
  expect(await getPublicClass(8)).toEqual(detail);
  expect(get).toHaveBeenCalledWith('/bookings/classes/8');

  const order = { orderId: 102, orderNumber: 'ORD-GC-102', amount: 500000, expiresAt: '2026-11-01T10:00:00.000Z', registrationId: 55, status: 'PENDING_PAYMENT' };
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: order } });
  expect(await registerForClass(8)).toEqual(order);
  expect(post).toHaveBeenCalledWith('/bookings/classes/8/register');
});

test('registers on behalf of a selected Member and joins a full class waitlist', async () => {
  const post = vi.spyOn(apiClient, 'post')
    .mockResolvedValueOnce({ data: { success: true, data: { orderId: 10 } } })
    .mockResolvedValueOnce({ data: { success: true, data: { id: 21, classId: 8, memberId: 17, status: 'WAITING' } } });
  await registerMemberOnBehalf(8, 17);
  await joinClassWaitlist(8);
  expect(post).toHaveBeenNthCalledWith(1, '/group-classes/8/register-on-behalf', { memberId: 17 });
  expect(post).toHaveBeenNthCalledWith(2, '/group-classes/8/waitlist');
});

test('loads member waitlists, manager filters and invitation history from existing routes', async () => {
  const memberWaitlists = [{ id: 21, classId: 8, status: 'WAITING' }];
  const firstGet = vi.spyOn(apiClient, 'get')
    .mockResolvedValueOnce({ data: { success: true, data: { items: memberWaitlists } } })
    .mockResolvedValueOnce({ data: { success: true, data: { items: memberWaitlists, page: 1, limit: 10, total: 1 } } })
    .mockResolvedValueOnce({ data: { success: true, data: memberWaitlists[0] } });

  expect(await getMyWaitlists()).toEqual(memberWaitlists);
  expect(await getWaitlists({ page: 1, limit: 10, classId: 8, status: 'WAITING' })).toMatchObject({ total: 1 });
  expect(await getWaitlistHistory(21)).toEqual(memberWaitlists[0]);
  expect(firstGet).toHaveBeenNthCalledWith(1, '/waitlist/me');
  expect(firstGet).toHaveBeenNthCalledWith(2, '/waitlist', { params: { page: 1, limit: 10, classId: 8, status: 'WAITING' } });
  expect(firstGet).toHaveBeenNthCalledWith(3, '/waitlist/21/history');
});

test('responds to an invitation with the documented accept contract', async () => {
  const response = { waitlist: { id: 21, classId: 8, status: 'ACCEPTED' }, order: { id: 102, orderNumber: 'ORD-WL-102', status: 'PENDING_PAYMENT' } };
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: response } });

  expect(await respondToClassWaitlist(8, true)).toEqual(response);
  expect(post).toHaveBeenCalledWith('/group-classes/8/waitlist/respond', { accept: true });
});

test('cancels a registration through the booking cancellation endpoint', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { status: 'CANCELLED' } } });
  await cancelClassRegistration(55);
  expect(post).toHaveBeenCalledWith('/bookings/registrations/55/cancel');
});

test('loads the signed-in Member class registrations for the unified schedule', async () => {
  const registrations = [{ id: 55, status: 'PENDING_PAYMENT', groupClass: { id: 8, name: 'Bơi cơ bản' } }];
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: registrations } });
  expect(await getMyClassRegistrations()).toEqual(registrations);
  expect(get).toHaveBeenCalledWith('/bookings/registrations/me');
});
