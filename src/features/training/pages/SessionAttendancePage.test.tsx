import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api';
import { axiosError } from '../testing/axiosError';
import { renderWithProviders } from '../testing/renderWithProviders';
import type { SessionRoster } from '../types';
import { SessionAttendancePage } from './SessionAttendancePage';

vi.mock('../api');

const HOUR = 60 * 60 * 1000;

function roster(overrides: Partial<SessionRoster> = {}): SessionRoster {
  return {
    session: {
      id: 5,
      startsAt: new Date(Date.now() - HOUR).toISOString(),
      endsAt: new Date(Date.now() + HOUR).toISOString(),
      status: 'SCHEDULED',
      class: { id: 1, name: 'Bơi cơ bản' },
    },
    isLocked: false,
    students: [
      { registrationId: 31, member: { id: 3, memberCode: 'MEM-01', displayName: 'Trần Thị Bình' }, attendance: null },
      {
        registrationId: 32,
        member: { id: 4, memberCode: 'MEM-02', displayName: 'Phạm Minh Đức' },
        attendance: {
          id: 90,
          registrationId: 32,
          classSessionId: 5,
          status: 'PRESENT',
          note: null,
          checkedAt: null,
          markedById: 2,
          updatedAt: new Date().toISOString(),
        },
      },
    ],
    ...overrides,
  };
}

const renderPage = () =>
  renderWithProviders(<SessionAttendancePage />, {
    path: '/coach/sessions/:sessionId/attendance',
    route: '/coach/sessions/5/attendance',
  });

function studentGroup(name: string) {
  return screen.getByRole('group', { name: `Trạng thái của ${name}` });
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Điểm danh buổi học (FR-47)', () => {
  test('gửi một lần PUT với đúng payload cho cả danh sách', async () => {
    vi.mocked(api.getSessionAttendance).mockResolvedValue(roster());
    vi.mocked(api.markSessionAttendance).mockResolvedValue({ sessionId: 5, records: [] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tất cả có mặt' }));
    fireEvent.click(within(studentGroup('Phạm Minh Đức')).getByRole('radio', { name: 'Muộn' }));
    const row = studentGroup('Phạm Minh Đức').closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: /Thêm ghi chú/ }));
    fireEvent.change(within(row).getByLabelText('Ghi chú cho Phạm Minh Đức'), { target: { value: '  Đến muộn 10 phút ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điểm danh' }));

    await waitFor(() => expect(api.markSessionAttendance).toHaveBeenCalledTimes(1));
    expect(api.markSessionAttendance).toHaveBeenCalledWith(5, {
      records: [
        { classRegistrationId: 31, status: 'PRESENT' },
        { classRegistrationId: 32, status: 'LATE', note: 'Đến muộn 10 phút' },
      ],
    });
  });

  test('hỏi xác nhận và chỉ gửi học viên đã chọn khi còn người chưa điểm danh', async () => {
    vi.mocked(api.getSessionAttendance).mockResolvedValue(roster());
    vi.mocked(api.markSessionAttendance).mockResolvedValue({ sessionId: 5, records: [] });
    renderPage();

    fireEvent.click(within(await screen.findByRole('group', { name: 'Trạng thái của Phạm Minh Đức' })).getByRole('radio', { name: 'Vắng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điểm danh' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu những học viên đã chọn' }));

    await waitFor(() =>
      expect(api.markSessionAttendance).toHaveBeenCalledWith(5, { records: [{ classRegistrationId: 32, status: 'ABSENT' }] }),
    );
  });

  test('409 ATTENDANCE_LOCKED chuyển sang chế độ chỉ xem', async () => {
    vi.mocked(api.getSessionAttendance).mockResolvedValueOnce(roster()).mockResolvedValue(roster({ isLocked: true }));
    vi.mocked(api.markSessionAttendance).mockRejectedValue(
      axiosError(409, { code: 'ATTENDANCE_LOCKED', message: 'Bản ghi điểm danh không hợp lệ hoặc buổi học đã khóa dữ liệu.' }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tất cả có mặt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điểm danh' }));

    expect(await screen.findByText('Chỉ xem')).toBeInTheDocument();
    await waitFor(() => expect(within(studentGroup('Trần Thị Bình')).getByRole('radio', { name: 'Có mặt' })).toBeDisabled());
    expect(screen.queryByRole('button', { name: 'Lưu điểm danh' })).not.toBeInTheDocument();
  });

  test('422 REGISTRATION_NOT_ELIGIBLE đánh dấu đúng học viên lỗi', async () => {
    vi.mocked(api.getSessionAttendance).mockResolvedValue(roster());
    vi.mocked(api.markSessionAttendance).mockRejectedValue(
      axiosError(422, {
        code: 'REGISTRATION_NOT_ELIGIBLE',
        message: 'Học viên chưa đăng ký hợp lệ cho buổi học này.',
        details: { invalidRegistrationIds: [32] },
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tất cả có mặt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điểm danh' }));

    const invalidRow = await waitFor(() => {
      const row = studentGroup('Phạm Minh Đức').closest('li')!;
      expect(within(row).getByText('Học viên chưa đăng ký hợp lệ cho buổi học này.')).toBeInTheDocument();
      return row;
    });
    expect(invalidRow).toHaveAttribute('aria-describedby');
    expect(within(studentGroup('Trần Thị Bình').closest('li')!).queryByText(/chưa đăng ký hợp lệ/)).not.toBeInTheDocument();
  });

  test('hiện trạng thái chỉ xem ngay khi buổi học đã khóa', async () => {
    vi.mocked(api.getSessionAttendance).mockResolvedValue(
      roster({ isLocked: true, session: { ...roster().session, startsAt: new Date(Date.now() + 5 * HOUR).toISOString() } }),
    );
    renderPage();
    expect(await screen.findByText(/Buổi học chưa bắt đầu/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tất cả có mặt' })).not.toBeInTheDocument();
  });
});
