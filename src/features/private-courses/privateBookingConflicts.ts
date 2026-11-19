import type { MyClassRegistration } from '../member/bookingTypes';
import { findClassScheduleConflicts } from '../member/scheduleConflicts';
import { addDays, fromCenterDateTimeInput } from '../training/format';
import type { PrivateCourse, PrivateEnrollment } from './types';

export type BookingShift = { code: string; start: string; end: string };
export type BookingConflict = { date: string; labels: string[] };

const dayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Project the purchased occurrences if this shift is added to the current weekly selection. */
export function findPrivateBookingConflicts(
  course: PrivateCourse,
  startDate: string,
  shifts: BookingShift[],
  selected: string[],
  registrations: MyClassRegistration[],
  enrollments: PrivateEnrollment[],
): Map<string, BookingConflict[]> {
  const result = new Map<string, BookingConflict[]>();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return result;
  const endDate = addDays(startDate, course.validityDays);
  for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 0]) for (const shift of shifts) {
    const candidate = `${dayOfWeek}:${shift.code}`;
    const patterns = [...new Set([...selected, candidate])];
    const occurrences = patterns.flatMap((key) => {
      const [dayText, code] = key.split(':');
      const pattern = shifts.find((item) => item.code === code);
      if (!pattern) return [];
      const day = Number(dayText);
      const first = addDays(startDate, (day - dayOf(startDate) + 7) % 7);
      const entries: { key: string; date: string; startsAt: string; endsAt: string }[] = [];
      for (let date = first, count = 0; date <= endDate && count < course.totalSessions; date = addDays(date, 7), count += 1) {
        const startsAt = fromCenterDateTimeInput(`${date}T${pattern.start}`);
        entries.push({ key, date, startsAt, endsAt: new Date(Date.parse(startsAt) + course.sessionDurationMinutes * 60_000).toISOString() });
      }
      return entries;
    }).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, course.totalSessions);
    const target = occurrences.map((item, id) => ({ ...item, id: id + 1, status: 'SCHEDULED' }));
    const conflicts = findClassScheduleConflicts(-1, target, registrations, enrollments);
    const matched = target.filter((item) => item.key === candidate && conflicts.has(item.id)).map((item) => ({ date: item.date, labels: conflicts.get(item.id)! }));
    if (matched.length) result.set(candidate, matched);
  }
  return result;
}
