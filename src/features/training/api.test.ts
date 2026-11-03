import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { getCoachMembers, getCoachSessions, getCoachTrainees, getMemberContexts, getSports } from './api';
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
  test('lấy buổi trong khoảng thời gian, bỏ lớp hủy/nháp, đếm sĩ số và số đã điểm danh', async () => {
    const rows = [
      {
        id: 10,
        startsAt: '2026-10-25T01:00:00.000Z',
        endsAt: '2026-10-25T02:00:00.000Z',
        status: 'SCHEDULED',
        class: { id: 1, name: 'Lớp 1', sport: { name: 'Bơi lội' } },
        room: { code: 'P1', name: 'Hồ bơi 1' },
        confirmedCount: 2,
        markedCount: 1,
        isLocked: true,
      },
      {
        id: 11,
        startsAt: '2026-10-26T01:00:00.000Z',
        endsAt: '2026-10-26T02:00:00.000Z',
        status: 'SCHEDULED',
        class: { id: 1, name: 'Lớp 1', sport: { name: 'Bơi lội' } },
        room: { code: 'P1', name: 'Hồ bơi 1' },
        confirmedCount: 2,
        markedCount: 0,
        isLocked: false,
      },
    ];
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: rows });

    const result = await getCoachSessions({ from: '2026-10-24T17:00:00.000Z', to: '2026-10-26T16:59:59.999Z' });

    expect(get).toHaveBeenCalledWith('/coaches/me/sessions', {
      params: { from: '2026-10-24T17:00:00.000Z', to: '2026-10-26T16:59:59.999Z' },
    });
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

  test('không cần phân trang học viên khi lấy lịch Coach', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });

    await expect(getCoachSessions({ from: '2026-10-24T17:00:00.000Z', to: '2026-10-26T16:59:59.999Z' })).resolves.toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/coaches/me/sessions', {
      params: { from: '2026-10-24T17:00:00.000Z', to: '2026-10-26T16:59:59.999Z' },
    });
  });
});

describe('form đánh giá: học viên và ngữ cảnh (FR-52)', () => {
  test('GET /api/coaches/me/members đi hết các trang, giữ tên học viên', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { items: [{ id: 3, displayName: 'Trần Thị Bình', memberCode: 'MEM-01' }], page: 1, pageSize: 1, total: 2 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 4, displayName: null, memberCode: 'MEM-02' }], page: 2, pageSize: 1, total: 2 } });
    await expect(getCoachMembers()).resolves.toEqual([
      { id: 3, memberCode: 'MEM-01', displayName: 'Trần Thị Bình' },
      { id: 4, memberCode: 'MEM-02', displayName: null },
    ]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith('/coaches/me/members', { params: { page: 2, pageSize: 100 } });
  });

  test('GET /api/members/:id: lớp nhóm chỉ lấy lượt CONFIRMED, khóa 1-1 giữ trạng thái để form khóa lựa chọn', async () => {
    const get = mockGet({
      classRegistrations: [
        { id: 31, status: 'CONFIRMED', class: { id: 1, name: 'Bơi cơ bản', sport: 'Bơi lội' } },
        { id: 32, status: 'CANCELLED', class: { id: 2, name: 'Bơi nâng cao', sport: 'Bơi lội' } },
      ],
      privateEnrollments: [{ id: 15, status: 'PENDING_PAYMENT', course: { id: 7, name: 'Bơi 1-1', sport: 'Bơi lội' } }],
    });
    await expect(getMemberContexts(3)).resolves.toEqual([
      { type: 'GROUP_CLASS', classRegistrationId: 31, name: 'Bơi cơ bản', sport: { name: 'Bơi lội' } },
      { type: 'PRIVATE_COURSE', privateEnrollmentId: 15, name: 'Bơi 1-1', sport: { name: 'Bơi lội' }, status: 'PENDING_PAYMENT' },
    ]);
    expect(get).toHaveBeenCalledWith('/members/3');
  });
});
