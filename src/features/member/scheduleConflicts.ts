import type { MyClassRegistration } from './bookingTypes';
import type { PrivateEnrollment } from '../private-courses/types';
import { addDays, fromCenterDateTimeInput } from '../training/format';

type Interval = { startsAt: string; endsAt: string; label: string };
const clock = (value: string) => value.includes('T') ? value.slice(11, 16) : value.slice(0, 5);

export function findClassScheduleConflicts(
  targetClassId: number,
  sessions: Array<{ id: number; startsAt: string; endsAt: string; status: string }>,
  registrations: MyClassRegistration[],
  enrollments: PrivateEnrollment[],
): Map<number, string[]> {
  const occupied: Interval[] = registrations
    .filter((entry) => entry.status === 'CONFIRMED' && entry.classId !== targetClassId)
    .flatMap((entry) => entry.groupClass.sessions
      .filter((session) => session.status === 'SCHEDULED')
      .map((session) => ({ startsAt: session.startsAt, endsAt: session.endsAt, label: entry.groupClass.name })));

  for (const enrollment of enrollments.filter((item) => item.status === 'ACTIVE')) {
    for (const schedule of enrollment.schedules.filter((item) => item.status === 'ACTIVE')) {
      const start = [schedule.effectiveFrom.slice(0, 10), enrollment.startDate.slice(0, 10)].sort().at(-1)!;
      const end = [schedule.effectiveTo.slice(0, 10), enrollment.expiryDate.slice(0, 10)].sort()[0]!;
      if (start > end) continue;
      const day = new Date(`${start}T12:00:00Z`).getUTCDay();
      for (let date = addDays(start, (schedule.dayOfWeek - day + 7) % 7), count = 0; date <= end && count < 550; date = addDays(date, 7), count += 1) {
        occupied.push({
          startsAt: fromCenterDateTimeInput(`${date}T${clock(schedule.startTime)}`),
          endsAt: fromCenterDateTimeInput(`${date}T${clock(schedule.endTime)}`),
          label: enrollment.privateCourse.name,
        });
      }
    }
  }

  const conflicts = new Map<number, string[]>();
  for (const session of sessions.filter((item) => item.status !== 'CANCELLED')) {
    const start = Date.parse(session.startsAt);
    const end = Date.parse(session.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const labels = [...new Set(occupied.filter((item) => Date.parse(item.startsAt) < end && Date.parse(item.endsAt) > start).map((item) => item.label))];
    if (labels.length) conflicts.set(session.id, labels);
  }
  return conflicts;
}
