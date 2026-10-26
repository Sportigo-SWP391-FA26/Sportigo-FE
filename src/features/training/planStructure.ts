import { diffDays, todayInCenter } from './format';
import type { WorkoutPlanItem } from './types';

export type PlanSession = { sessionNumber: number; items: WorkoutPlanItem[] };
export type PlanWeek = { weekNumber: number; sessions: PlanSession[]; itemCount: number };

/** Thứ tự chuẩn của mục giáo án: tuần → buổi → thứ tự */
export function compareItems(a: WorkoutPlanItem, b: WorkoutPlanItem) {
  return a.weekNumber - b.weekNumber || a.sessionNumber - b.sessionNumber || a.itemOrder - b.itemOrder;
}

export function groupPlanItems(items: WorkoutPlanItem[]): PlanWeek[] {
  const weeks = new Map<number, Map<number, WorkoutPlanItem[]>>();
  for (const item of [...items].sort(compareItems)) {
    const sessions = weeks.get(item.weekNumber) ?? new Map<number, WorkoutPlanItem[]>();
    sessions.set(item.sessionNumber, [...(sessions.get(item.sessionNumber) ?? []), item]);
    weeks.set(item.weekNumber, sessions);
  }
  return [...weeks.entries()].map(([weekNumber, sessions]) => ({
    weekNumber,
    itemCount: [...sessions.values()].reduce((sum, list) => sum + list.length, 0),
    sessions: [...sessions.entries()].map(([sessionNumber, list]) => ({ sessionNumber, items: list })),
  }));
}

/** Danh sách số tuần cần hiển thị: theo durationWeeks, hoặc theo tuần lớn nhất có mục */
export function planWeekNumbers(durationWeeks: number | null, items: WorkoutPlanItem[]) {
  const maxWeek = Math.max(durationWeeks ?? 0, ...items.map((item) => item.weekNumber), 1);
  return Array.from({ length: maxWeek }, (_, index) => index + 1);
}

export type PlanProgress = { week: number; state: 'upcoming' | 'in-progress' | 'finished' };

/**
 * Tuần hiện tại của chương trình, tính từ ngày bắt đầu khóa 1-1 theo giờ trung tâm.
 * Đây là vị trí theo lịch, không phải mức độ hoàn thành (backend chưa lưu hoàn thành từng mục).
 */
export function currentPlanWeek(
  startDate: string | null,
  durationWeeks: number | null,
  today = todayInCenter(),
): PlanProgress | null {
  if (!startDate) return null;
  const elapsedDays = diffDays(startDate, today);
  if (elapsedDays < 0) return { week: 1, state: 'upcoming' };
  const week = Math.floor(elapsedDays / 7) + 1;
  if (durationWeeks && week > durationWeeks) return { week: durationWeeks, state: 'finished' };
  return { week, state: 'in-progress' };
}
