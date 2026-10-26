import type { AxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { getCoachSessions, getCoachTrainees, getSports } from './api';
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

describe('buổi dạy của Coach (ghép FR-11 + FR-17 + FR-47)', () => {
  const groupClass = (id: number, status: string) => ({ id, name: `Lớp ${id}`, sport: 'Bơi lội', status });
  const session = (id: number, startsAt: string) => ({
    id,
    startsAt,
    endsAt: startsAt.replace('T01', 'T02'),
    status: 'SCHEDULED',
    room: { id: 9, code: 'P1', name: 'Hồ bơi 1', capacity: 20 },
  });

  test('lấy buổi trong khoảng thời gian, bỏ lớp hủy/nháp, đếm sĩ số và số đã điểm danh', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/coaches/me/members') {
        return {
          data: {
            items: [
              // Hai học viên cùng lớp 1 → lớp chỉ được lấy buổi một lần
              { id: 20, classes: [groupClass(1, 'IN_PROGRESS'), groupClass(3, 'CANCELLED')] },
              { id: 21, classes: [groupClass(1, 'IN_PROGRESS'), groupClass(4, 'DRAFT')] },
            ],
            page: 1,
            pageSize: 100,
            total: 2,
          },
        };
      }
      if (url === '/group-classes/1/sessions') {
        return {
          data: {
            success: true,
            data: [session(11, '2026-10-26T01:00:00.000Z'), session(10, '2026-10-25T01:00:00.000Z'), session(12, '2026-10-30T01:00:00.000Z')],
          },
        };
      }
      if (url.startsWith('/class-sessions/')) {
        const id = Number(url.split('/')[2]);
        return {
          data: {
            isLocked: id === 10,
            students: [
              { registrationId: 1, attendance: { status: 'PRESENT' } },
              { registrationId: 2, attendance: null },
            ],
          },
        };
      }
      throw new Error(`URL không mong đợi: ${url}`);
    });

    const result = await getCoachSessions({ from: '2026-10-24T17:00:00.000Z', to: '2026-10-26T16:59:59.999Z' });

    expect(get).toHaveBeenCalledWith('/coaches/me/members', { params: { type: 'CLASS', page: 1, pageSize: 100 } });
    expect(get).not.toHaveBeenCalledWith('/group-classes/3/sessions');
    expect(get).not.toHaveBeenCalledWith('/group-classes/4/sessions');
    expect(result.map((item) => item.id)).toEqual([10, 11]);
    expect(result[0]).toEqual({
      id: 10,
      startsAt: '2026-10-25T01:00:00.000Z',
      endsAt: '2026-10-25T02:00:00.000Z',
      status: 'SCHEDULED',
      class: { id: 1, name: 'Lớp 1', sport: { name: 'Bơi lội' } },
      room: { code: 'P1', name: 'Hồ bơi 1' },
      confirmedCount: 2,
      markedCount: 1,
      isLocked: true,
    });
  });

  test('đọc hết các trang học viên khi Coach có nhiều hơn 100 học viên', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
      if (url === '/coaches/me/members') {
        const page = (config?.params as { page?: number } | undefined)?.page ?? 1;
        return { data: { items: [{ id: page, classes: [groupClass(page, 'OPEN')] }], page, pageSize: 100, total: 150 } };
      }
      return { data: { success: true, data: [] } };
    });

    await expect(getCoachSessions({ from: '2026-10-24T17:00:00.000Z', to: '2026-10-26T16:59:59.999Z' })).resolves.toEqual([]);
    expect(get).toHaveBeenCalledWith('/group-classes/1/sessions');
    expect(get).toHaveBeenCalledWith('/group-classes/2/sessions');
    expect(get.mock.calls.filter(([url]) => url === '/coaches/me/members')).toHaveLength(2);
  });
});
