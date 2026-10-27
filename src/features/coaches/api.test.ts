import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { createCoachAvailability, getCoachSchedule, removeCoachSport } from './api';

afterEach(() => vi.restoreAllMocks());

describe('coach management API', () => {
  test('sends Coach schedule dates as YYYY-MM-DD query parameters', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } });
    await getCoachSchedule(12, '2026-10-01', '2026-10-31');
    expect(get).toHaveBeenCalledWith('/coaches/12/schedule', {
      params: { from: '2026-10-01', to: '2026-10-31' },
    });
  });

  test('creates availability using backend field names', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } });
    const input = {
      dayOfWeek: 2,
      startTime: '09:00',
      endTime: '11:00',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2026-12-31',
    };
    await createCoachAvailability(12, input);
    expect(post).toHaveBeenCalledWith('/coaches/12/availability', input);
  });

  test('removes a Coach sport using the nested endpoint', async () => {
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({
      data: { success: true, data: { coachId: 12, sportId: 3, removed: true } },
    });
    await removeCoachSport(12, 3);
    expect(remove).toHaveBeenCalledWith('/coaches/12/sports/3');
  });
});
