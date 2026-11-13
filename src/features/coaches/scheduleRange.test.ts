import { describe, expect, test } from 'vitest';
import { isCoachScheduleRangeValid } from './scheduleRange';

describe('coach schedule date range', () => {
  test('allows up to the backend 90-day limit', () => {
    expect(isCoachScheduleRangeValid('2026-01-01', '2026-04-01')).toBe(true);
    expect(isCoachScheduleRangeValid('2026-01-01', '2026-04-02')).toBe(false);
  });

  test('rejects reversed and non-date ranges', () => {
    expect(isCoachScheduleRangeValid('2026-02-01', '2026-01-01')).toBe(false);
    expect(isCoachScheduleRangeValid('', '2026-01-01')).toBe(false);
    expect(isCoachScheduleRangeValid('2026-99-99', '2026-10-01')).toBe(false);
  });
});
