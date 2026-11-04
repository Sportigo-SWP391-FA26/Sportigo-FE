// Dữ liệu mẫu CHỈ dùng trong test, mô phỏng đúng response của backend.
import { addDays, todayInCenter } from '../format';
import type { MemberPlanAssignment, WorkoutPlanItem } from '../types';

export function planItem(overrides: Partial<WorkoutPlanItem> = {}): WorkoutPlanItem {
  return {
    id: 1,
    weekNumber: 1,
    sessionNumber: 1,
    itemOrder: 1,
    title: 'Khởi động',
    content: 'Xoay khớp, đi bộ dưới nước 5 phút',
    durationMinutes: 10,
    sets: null,
    repetitions: null,
    intensity: 'LOW',
    note: null,
    ...overrides,
  };
}

/** Assignment bắt đầu 8 ngày trước → đang ở tuần 2 */
export function memberAssignment(overrides: Partial<MemberPlanAssignment> = {}): MemberPlanAssignment {
  const startDate = addDays(todayInCenter(), -8);
  return {
    id: 7,
    status: 'ACTIVE',
    assignedAt: '2026-10-01T03:00:00.000Z',
    assignedBy: { id: 2, coachCode: 'COA-DEMO-01', displayName: 'Lê Văn Cường' },
    workoutPlan: {
      id: 1,
      name: 'Bơi ếch nền tảng 4 tuần',
      level: 'BEGINNER',
      description: 'Giáo án cho người mới học bơi ếch',
      durationWeeks: 4,
      sport: { id: 1, name: 'Bơi lội' },
      items: [
        planItem({ id: 1 }),
        planItem({ id: 2, weekNumber: 2, title: 'Lướt nước', content: 'Đạp thành, lướt 5m', sets: 4, repetitions: 6 }),
        planItem({ id: 3, weekNumber: 2, sessionNumber: 2, title: 'Phối hợp tay chân', content: 'Bơi 25m' }),
      ],
    },
    enrollment: {
      id: 15,
      status: 'ACTIVE',
      startDate,
      expiryDate: addDays(startDate, 60),
      course: { id: 3, name: 'Bơi 1-1 – 12 buổi' },
      coach: { id: 2, coachCode: 'COA-DEMO-01', displayName: 'Lê Văn Cường' },
    },
    ...overrides,
  };
}
