import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { CoachMember } from '../types';
import { CoachMembersPage } from './CoachMembersPage';

vi.mock('../api');

const member: CoachMember = {
  id: 20,
  displayName: 'Trần Bình',
  memberCode: 'MEM-1A2B3C4D',
  gender: 'MALE',
  dateOfBirth: '2000-05-20',
  classes: [{ id: 3, name: 'Yoga sáng', sport: 'Yoga', status: 'IN_PROGRESS' }],
  privateCourses: [{ enrollmentId: 9, name: 'Bơi 1-1', sport: 'Bơi', status: 'ACTIVE', remainingSessions: 6, expiryDate: '2026-12-31' }],
  goals: {
    workoutPlans: [{ id: 5, name: 'Bơi sải cơ bản', level: 'BEGINNER' }],
    latestAssessment: { assessmentDate: '2026-10-20', score: 7.5, recommendation: 'Tăng sức bền', nextAssessmentDate: '2026-11-20' },
  },
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Học viên của Coach (FR-11)', () => {
  test('hiển thị lớp, khóa 1-1, giáo án và đánh giá; tên dẫn tới hồ sơ', async () => {
    vi.mocked(api.listMyMembers).mockResolvedValue({ items: [member], page: 1, pageSize: 20, total: 1 });
    renderWithProviders(<CoachMembersPage />);

    expect(await screen.findByRole('link', { name: 'Trần Bình' })).toHaveAttribute('href', '/coach/members/20');
    expect(screen.getByText(/còn 6 buổi/)).toBeInTheDocument();
    expect(screen.getByText('Bơi sải cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Đề xuất: Tăng sức bền')).toBeInTheDocument();
    expect(screen.getByText(/điểm 7.5 · lần tới 20\/11\/2026/)).toBeInTheDocument();
  });

  test('lọc theo loại gửi type lên API', async () => {
    vi.mocked(api.listMyMembers).mockResolvedValue({ items: [member], page: 1, pageSize: 20, total: 1 });
    renderWithProviders(<CoachMembersPage />);
    await screen.findByText('Trần Bình');

    fireEvent.change(screen.getByLabelText('Lọc theo loại'), { target: { value: 'PRIVATE' } });
    await waitFor(() => expect(api.listMyMembers).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'PRIVATE', page: 1 })));
  });

  test('chưa có học viên thì hiện trạng thái trống', async () => {
    vi.mocked(api.listMyMembers).mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    renderWithProviders(<CoachMembersPage />);
    expect(await screen.findByText('Chưa có học viên')).toBeInTheDocument();
  });
});
