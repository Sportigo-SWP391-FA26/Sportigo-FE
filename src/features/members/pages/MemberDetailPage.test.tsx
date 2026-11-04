import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { MemberProfile } from '../types';
import { MemberDetailPage } from './MemberDetailPage';

vi.mock('../api');

const coach = { id: 7, displayName: 'Lan' };
const profile: MemberProfile = {
  id: 20,
  displayName: 'Trần Bình',
  email: 'binh@gmail.com',
  phone: '0912345678',
  status: 'ACTIVE',
  emailVerified: true,
  memberCode: 'MEM-1A2B3C4D',
  dateOfBirth: '2000-05-20',
  gender: 'MALE',
  emergencyContact: 'Mẹ 0909',
  trainingGoal: 'Cải thiện sức bền',
  joinedAt: '2026-10-01T00:00:00.000Z',
  classRegistrations: [
    {
      id: 1,
      status: 'CONFIRMED',
      registeredAt: '2026-10-02T00:00:00.000Z',
      class: { id: 3, name: 'Yoga sáng', sport: 'Yoga', status: 'IN_PROGRESS', startDate: '2026-10-05', endDate: '2026-12-05', coach },
      attendance: { present: 2, late: 1, absent: 1, excused: 0, total: 4 },
    },
  ],
  privateEnrollments: [
    {
      id: 9,
      status: 'ACTIVE',
      course: { id: 2, name: 'Bơi 1-1', sport: 'Bơi' },
      coach,
      purchasedSessions: 10,
      remainingSessions: 6,
      usedSessions: 4,
      startDate: '2026-10-01',
      expiryDate: '2026-12-31',
    },
  ],
  assessments: [],
  payments: [{ id: 1, orderNumber: 'ORD-1', status: 'PAID', finalAmount: 500000, paidAt: '2026-10-02T03:00:00.000Z', createdAt: '2026-10-02T03:00:00.000Z' }],
  scope: 'STAFF',
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const renderPage = () =>
  renderWithProviders(<MemberDetailPage backTo="/app/users" backLabel="Danh sách người dùng" />, {
    path: '/app/members/:memberId',
    route: '/app/members/20',
  });

describe('Hồ sơ tổng hợp hội viên (FR-10)', () => {
  test('nhân viên thấy liên hệ, điểm danh, buổi còn lại và thanh toán', async () => {
    vi.mocked(api.getMemberProfile).mockResolvedValue(profile);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Trần Bình' })).toBeInTheDocument();
    expect(api.getMemberProfile).toHaveBeenCalledWith(20);
    expect(screen.getByText('binh@gmail.com')).toBeInTheDocument();
    expect(screen.getByText(/2 có mặt · 1 trễ · 1 vắng · 0 có phép \(75% tham gia\)/)).toBeInTheDocument();
    expect(screen.getByText('Đã học 4/10 buổi · còn 6 buổi')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thanh toán gần đây' })).toBeInTheDocument();
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
  });

  test('góc nhìn Coach không có email, SĐT, thanh toán', async () => {
    vi.mocked(api.getMemberProfile).mockResolvedValue({ ...profile, email: null, phone: null, payments: null, scope: 'COACH' });
    renderPage();

    expect(await screen.findByText(/Chỉ hiển thị lớp, khóa 1-1 và đánh giá do bạn phụ trách/)).toBeInTheDocument();
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Thanh toán gần đây' })).not.toBeInTheDocument();
  });

  test('không có quyền xem (404) hiển thị trạng thái lỗi', async () => {
    vi.mocked(api.getMemberProfile).mockRejectedValue(axiosError(404, { code: 'MEMBER_NOT_FOUND', message: 'Không tìm thấy hội viên' }));
    renderPage();
    expect(await screen.findByText(/Không tìm thấy hội viên/)).toBeInTheDocument();
  });
});
