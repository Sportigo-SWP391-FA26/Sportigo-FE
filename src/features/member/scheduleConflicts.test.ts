import { describe, expect, it } from 'vitest';
import { findClassScheduleConflicts } from './scheduleConflicts';
import type { MyClassRegistration } from './bookingTypes';
import type { PrivateEnrollment } from '../private-courses/types';

const target = [{ id: 1, startsAt: '2026-11-11T12:00:00.000Z', endsAt: '2026-11-11T13:30:00.000Z', status: 'SCHEDULED' }];

describe('class schedule conflict hints', () => {
  it('marks an overlapping confirmed group class and ignores cancelled or unpaid registrations', () => {
    const registration = (status: MyClassRegistration['status'], sessionStatus: 'SCHEDULED' | 'CANCELLED') => ({
      classId: 9, status, groupClass: { name: 'Yoga phục hồi', sessions: [{ startsAt: '2026-11-11T13:00:00.000Z', endsAt: '2026-11-11T14:30:00.000Z', status: sessionStatus }] },
    }) as MyClassRegistration;
    expect(findClassScheduleConflicts(2, target, [registration('CONFIRMED', 'SCHEDULED')], []) .get(1)).toEqual(['Yoga phục hồi']);
    expect(findClassScheduleConflicts(2, target, [registration('PENDING_PAYMENT', 'SCHEDULED'), registration('CONFIRMED', 'CANCELLED')], []).size).toBe(0);
  });

  it('marks an overlapping weekly private course in Vietnam time', () => {
    const enrollment = { status: 'ACTIVE', startDate: '2026-11-01', expiryDate: '2026-11-30', privateCourse: { name: 'Gym 1–1' }, schedules: [{ status: 'ACTIVE', effectiveFrom: '2026-11-01', effectiveTo: '2026-11-30', dayOfWeek: 3, startTime: '19:00:00', endTime: '20:30:00' }] } as PrivateEnrollment;
    expect(findClassScheduleConflicts(2, target, [], [enrollment]).get(1)).toEqual(['Gym 1–1']);
  });
});
