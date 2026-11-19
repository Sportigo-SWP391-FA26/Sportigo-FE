import { expect, test } from 'vitest';
import type { MyClassRegistration } from '../member/bookingTypes';
import type { PrivateCourse } from './types';
import { findPrivateBookingConflicts } from './privateBookingConflicts';

const course = { totalSessions: 2, sessionDurationMinutes: 60, validityDays: 30 } as PrivateCourse;
const shifts = [{ code: 'S2', start: '09:00', end: '10:30' }];
const registration = { status: 'CONFIRMED', classId: 5, groupClass: { name: 'Yoga phục hồi', sessions: [{ id: 1, startsAt: '2030-01-08T02:30:00.000Z', endsAt: '2030-01-08T03:30:00.000Z', status: 'SCHEDULED' }] } } as MyClassRegistration;

test('marks the recurring shift red when one purchased occurrence overlaps a confirmed class', () => {
  const conflicts = findPrivateBookingConflicts(course, '2030-01-01', shifts, [], [registration], []);
  expect(conflicts.get('2:S2')).toEqual([{ date: '2030-01-08', labels: ['Yoga phục hồi'] }]);
  expect(conflicts.has('4:S2')).toBe(false);
});

test('does not flag an occurrence beyond the purchased session count', () => {
  const later = { ...registration, groupClass: { ...registration.groupClass, sessions: [{ ...registration.groupClass.sessions[0], startsAt: '2030-01-15T02:30:00.000Z', endsAt: '2030-01-15T03:30:00.000Z' }] } } as MyClassRegistration;
  const conflicts = findPrivateBookingConflicts(course, '2030-01-01', shifts, [], [later], []);
  expect(conflicts.has('2:S2')).toBe(false);
});
