import { describe, expect, test } from 'vitest';
import { parseApiError } from './errors';
import { formatDate, formatDateTime, monthRange, startOfCenterDay, weekRange } from './format';
import { currentPlanWeek, groupPlanItems } from './planStructure';
import { axiosError } from './testing/axiosError';
import type { WorkoutPlanItem } from './types';

const item = (weekNumber: number, sessionNumber: number, itemOrder: number): WorkoutPlanItem => ({
  id: weekNumber * 100 + sessionNumber * 10 + itemOrder,
  weekNumber,
  sessionNumber,
  itemOrder,
  title: `Mục ${itemOrder}`,
  content: 'Nội dung',
  durationMinutes: null,
  sets: null,
  repetitions: null,
  intensity: null,
  note: null,
});

describe('định dạng ngày giờ theo Asia/Ho_Chi_Minh', () => {
  test('đổi thời điểm UTC sang giờ trung tâm dạng dd/MM/yyyy HH:mm', () => {
    expect(formatDateTime('2026-10-12T17:30:00.000Z')).toBe('13/10/2026 00:30');
  });

  test('ngày không có giờ không bị lệch múi giờ', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
  });

  test('tuần bắt đầu từ Thứ Hai và đầu ngày tính theo UTC+7', () => {
    expect(weekRange('2026-10-18')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(monthRange('2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(startOfCenterDay('2026-10-12')).toBe('2026-10-11T17:00:00.000Z');
  });
});

describe('cấu trúc giáo án', () => {
  test('nhóm mục theo tuần → buổi và giữ đúng thứ tự', () => {
    const weeks = groupPlanItems([item(2, 1, 1), item(1, 2, 1), item(1, 1, 2), item(1, 1, 1)]);
    expect(weeks.map((week) => week.weekNumber)).toEqual([1, 2]);
    expect(weeks[0].sessions.map((session) => session.sessionNumber)).toEqual([1, 2]);
    expect(weeks[0].sessions[0].items.map((entry) => entry.itemOrder)).toEqual([1, 2]);
    expect(weeks[0].itemCount).toBe(3);
  });

  test('tuần hiện tại tính từ ngày bắt đầu khóa', () => {
    expect(currentPlanWeek('2026-10-01', 4, '2026-10-12')).toEqual({ week: 2, state: 'in-progress' });
    expect(currentPlanWeek('2026-10-20', 4, '2026-10-12')).toEqual({ week: 1, state: 'upcoming' });
    expect(currentPlanWeek('2026-01-01', 4, '2026-10-12')).toEqual({ week: 4, state: 'finished' });
  });
});

describe('đọc lỗi API', () => {
  test('ưu tiên message tiếng Việt của backend và giữ mã lỗi', () => {
    const error = parseApiError(axiosError(409, { code: 'DUPLICATE_ITEM_ORDER', message: 'Thứ tự mục giáo án bị trùng.' }));
    expect(error).toMatchObject({ kind: 'conflict', code: 'DUPLICATE_ITEM_ORDER', message: 'Thứ tự mục giáo án bị trùng.' });
  });

  test('lỗi validate tiếng Anh của zod được thay bằng tiếng Việt theo từng trường', () => {
    const error = parseApiError(
      axiosError(422, {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: { fieldErrors: { name: ['Too small'], assessmentDate: ['Ngày đánh giá không được ở tương lai'] } },
      }),
    );
    expect(error.kind).toBe('validation');
    expect(error.fieldErrors).toEqual({ name: 'Giá trị không hợp lệ.', assessmentDate: 'Ngày đánh giá không được ở tương lai' });
  });

  test('route chưa tồn tại (404 không có mã lỗi) được coi là chưa sẵn sàng', () => {
    expect(parseApiError(axiosError(404, '<pre>Cannot GET /api/sports</pre>')).kind).toBe('not-ready');
    expect(parseApiError(axiosError(404, { code: 'NOT_FOUND', message: 'Không tìm thấy buổi học' })).kind).toBe('not-found');
  });
});
