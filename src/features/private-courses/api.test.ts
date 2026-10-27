import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { changePrivateOccurrence, getPrivateCourse } from './api';

afterEach(() => vi.restoreAllMocks());

describe('private course API', () => {
  test('loads one course without requesting enrollment details', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: { id: 9 } } });
    await getPrivateCourse(9);
    expect(get).toHaveBeenCalledWith('/private-courses/9');
  });

  test('changes one occurrence and omits newRoomId when retaining the existing room', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      data: { success: true, data: { id: 4, scheduleId: 6, sessionDate: '2026-12-01', action: 'RESCHEDULED' } },
    });
    const input = {
      action: 'RESCHEDULED' as const,
      newStartsAt: '2026-12-03T02:00:00.000Z',
      reason: 'Bận lịch',
    };
    await changePrivateOccurrence(10, 6, '2026-12-01', input);
    expect(patch).toHaveBeenCalledWith(
      '/private-courses/enrollments/10/schedules/6/occurrences/2026-12-01',
      input,
    );
    expect(input).not.toHaveProperty('newRoomId');
  });
});
