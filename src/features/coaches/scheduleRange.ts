import { diffDays } from '../training/format';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isCoachScheduleRangeValid(from: string, to: string) {
  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to) || from > to) return false;
  const parsedFrom = new Date(`${from}T00:00:00.000Z`);
  const parsedTo = new Date(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(parsedFrom.getTime()) || !Number.isFinite(parsedTo.getTime())) return false;
  if (parsedFrom.toISOString().slice(0, 10) !== from || parsedTo.toISOString().slice(0, 10) !== to) return false;
  return diffDays(from, to) <= 90;
}
