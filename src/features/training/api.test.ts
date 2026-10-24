import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { getCoachTrainees, getSports } from './api';
import { traineeLabel, traineeName } from './labels';

// Dữ liệu theo đúng dạng module Bộ môn và Khóa 1-1 của backend trả về: { success, data }
function mockGet(body: unknown) {
  return vi.spyOn(apiClient, 'get').mockResolvedValue({ data: body });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/sports', () => {
  test('đọc dạng { success, data } và chỉ giữ môn đang hoạt động', async () => {
    const get = mockGet({
      success: true,
      data: [
        { id: 1, name: 'Bơi lội', isActive: true },
        { id: 2, name: 'Quần vợt', isActive: false },
      ],
    });
    await expect(getSports()).resolves.toEqual([{ id: 1, name: 'Bơi lội', isActive: true }]);
    expect(get).toHaveBeenCalledWith('/sports');
  });

  test('vẫn đọc được mảng thuần hoặc dạng phân trang', async () => {
    mockGet([{ id: 1, name: 'Bơi lội', isActive: true }]);
    await expect(getSports()).resolves.toHaveLength(1);
    mockGet({ items: [{ id: 3, name: 'Gym' }], page: 1, pageSize: 20, total: 1 });
    await expect(getSports()).resolves.toEqual([{ id: 3, name: 'Gym' }]);
  });
});

describe('học viên Coach phụ trách (từ GET /api/private-courses/enrollments)', () => {
  const enrollment = (id: number, memberId: number, status: string, sport = { id: 1, name: 'Bơi lội' }) => ({
    id,
    status,
    member: { userId: memberId, memberCode: `MEM-${memberId}` },
    privateCourse: { name: `Khóa ${id}`, sport: { ...sport, isActive: true } },
    schedules: [],
  });

  test('gom các khóa 1-1 theo học viên, mỗi khóa là một ngữ cảnh PRIVATE_COURSE', async () => {
    const get = mockGet({
      success: true,
      data: [enrollment(11, 4, 'ACTIVE'), enrollment(12, 5, 'COMPLETED', { id: 2, name: 'Gym' }), enrollment(13, 4, 'PENDING_PAYMENT')],
    });

    const trainees = await getCoachTrainees();

    expect(get).toHaveBeenCalledWith('/private-courses/enrollments');
    expect(trainees).toEqual([
      {
        member: { id: 4, memberCode: 'MEM-4', displayName: null },
        contexts: [
          { type: 'PRIVATE_COURSE', privateEnrollmentId: 11, name: 'Khóa 11', sport: { id: 1, name: 'Bơi lội' }, status: 'ACTIVE' },
          { type: 'PRIVATE_COURSE', privateEnrollmentId: 13, name: 'Khóa 13', sport: { id: 1, name: 'Bơi lội' }, status: 'PENDING_PAYMENT' },
        ],
      },
      {
        member: { id: 5, memberCode: 'MEM-5', displayName: null },
        contexts: [{ type: 'PRIVATE_COURSE', privateEnrollmentId: 12, name: 'Khóa 12', sport: { id: 2, name: 'Gym' }, status: 'COMPLETED' }],
      },
    ]);
  });

  test('dùng tên học viên khi backend bổ sung member.user.displayName', async () => {
    mockGet({ success: true, data: [{ ...enrollment(11, 4, 'ACTIVE'), member: { userId: 4, memberCode: 'MEM-4', user: { displayName: 'Phạm Minh Đức' } } }] });
    const [trainee] = await getCoachTrainees();
    expect(traineeLabel(trainee.member)).toBe('Phạm Minh Đức · MEM-4');
  });

  test('chưa có tên thì hiển thị mã học viên, không lặp mã hai lần', () => {
    const member = { id: 4, memberCode: 'MEM-4', displayName: null };
    expect(traineeName(member)).toBe('MEM-4');
    expect(traineeLabel(member)).toBe('MEM-4');
  });
});
