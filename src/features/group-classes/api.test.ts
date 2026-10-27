import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import {
  cancelClassSession,
  changeClassSession,
  createClassSession,
  createGroupClass,
  createRecurringClassSessions,
  updateGroupClass,
  updateGroupClassStatus,
} from './api';

afterEach(() => vi.restoreAllMocks());

describe('group class management API', () => {
  test('patches editable class fields without sending status', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: {} } });
    const input = {
      sportId: 1,
      coachId: 8,
      name: 'Lớp cầu lông',
      description: null,
      capacity: 12,
      tuitionFee: 500000,
      registrationOpenAt: '2026-10-01T03:00:00.000Z',
      registrationCloseAt: '2026-10-05T03:00:00.000Z',
      startDate: '2026-10-10T00:00:00.000Z',
      endDate: '2026-12-10T00:00:00.000Z',
    };
    await updateGroupClass(5, input);
    expect(patch).toHaveBeenCalledWith('/group-classes/5', input);
    expect(input).not.toHaveProperty('status');
  });

  test('cancels an individual session, not the group class', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { success: true, data: { id: 21, status: 'CANCELLED' } },
    });
    await cancelClassSession(21, 'Thời tiết xấu');
    expect(post).toHaveBeenCalledWith('/class-sessions/21/cancel', { reason: 'Thời tiết xấu' });
  });

  test('creates a group class and updates status through its dedicated endpoint', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } });
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: {} } });
    const input = {
      sportId: 2, coachId: 8, name: 'Lớp cầu lông', description: null, capacity: 12, tuitionFee: 500000,
      registrationOpenAt: '2026-10-01T03:00:00.000Z', registrationCloseAt: '2026-10-05T03:00:00.000Z',
      startDate: '2026-10-10T00:00:00.000Z', endDate: '2026-12-10T00:00:00.000Z',
    };
    await createGroupClass(input);
    await updateGroupClassStatus(5, 'OPEN');
    expect(post).toHaveBeenCalledWith('/group-classes', input);
    expect(patch).toHaveBeenCalledWith('/group-classes/5/status', { status: 'OPEN' });
  });

  test('creates one-off and recurring sessions with backend request shapes', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: [] } });
    const oneOff = { roomId: 3, startsAt: '2030-02-01T03:00:00.000Z', endsAt: '2030-02-01T04:00:00.000Z' };
    const recurring = {
      roomId: 3,
      recurrence: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', effectiveFrom: '2030-02-01', effectiveTo: '2030-03-01' },
    };
    await createClassSession(5, oneOff);
    await createRecurringClassSessions(5, recurring);
    expect(post).toHaveBeenNthCalledWith(1, '/group-classes/5/sessions', oneOff);
    expect(post).toHaveBeenNthCalledWith(2, '/group-classes/5/sessions/recurring', recurring);
  });

  test('changes one session and allows keeping the current room by omitting newRoomId', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } });
    const input = { newStartsAt: '2030-02-01T04:00:00.000Z', reason: 'Phòng bảo trì' };
    await changeClassSession(21, input);
    expect(post).toHaveBeenCalledWith('/class-sessions/21/change', input);
    expect(input).not.toHaveProperty('newRoomId');
  });
});
