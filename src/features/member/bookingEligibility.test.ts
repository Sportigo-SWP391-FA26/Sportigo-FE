import { describe, expect, it } from 'vitest';
import { isClassBookable } from './bookingEligibility';

const now = Date.parse('2026-10-30T06:00:00.000Z');

describe('isClassBookable', () => {
  it('accepts only an open class inside its registration window and before start', () => {
    expect(isClassBookable({
      status: 'OPEN',
      registrationOpenAt: '2026-10-29T00:00:00.000Z',
      registrationCloseAt: '2026-10-31T00:00:00.000Z',
      startDate: '2026-11-01T00:00:00.000Z',
    }, now)).toBe(true);
  });

  it('rejects a class that has already started even if its status is still OPEN', () => {
    expect(isClassBookable({
      status: 'OPEN',
      registrationOpenAt: '2026-10-01T00:00:00.000Z',
      registrationCloseAt: '2026-11-01T00:00:00.000Z',
      startDate: '2026-10-29T00:00:00.000Z',
    }, now)).toBe(false);
  });
});
