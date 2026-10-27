import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { PrivateCourse } from '../types';
import { PrivateCourseDetailPage } from './PrivateCourseDetailPage';

vi.mock('../api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const course: PrivateCourse = {
  id: 9,
  sportId: 2,
  name: 'Bơi cơ bản',
  description: 'Kỹ thuật và an toàn dưới nước.',
  totalSessions: 24,
  sessionDurationMinutes: 60,
  validityDays: 180,
  price: '1200000',
  status: 'ACTIVE',
  sport: { id: 2, name: 'Bơi lội', isActive: true },
  coaches: [{
    coachId: 12,
    privateCourseId: 9,
    customPrice: null,
    isActive: true,
    coach: {
      user: { id: 12, displayName: 'Coach An' },
      availabilities: [{
        id: 31,
        dayOfWeek: 2,
        startTime: '1970-01-01T09:00:00.000Z',
        endTime: '1970-01-01T11:00:00.000Z',
        effectiveFrom: '2030-01-01',
        effectiveTo: null,
        status: 'AVAILABLE',
      }],
    },
  }],
};

test('shows course, sport, price, Coach and availability without enrollment details', async () => {
  vi.mocked(api.getPrivateCourse).mockResolvedValue(course);
  renderWithProviders(<PrivateCourseDetailPage />, { path: '/member/private-courses/:courseId', route: '/member/private-courses/9' });

  expect(await screen.findByRole('heading', { name: 'Bơi cơ bản' })).toBeInTheDocument();
  expect(screen.getByText('Bơi lội')).toBeInTheDocument();
  expect(screen.getByText('Coach An')).toBeInTheDocument();
  expect(screen.getByText('09:00–11:00')).toBeInTheDocument();
  expect(screen.queryByText(/enrollment/i)).not.toBeInTheDocument();
  expect(api.getPrivateCourse).toHaveBeenCalledWith(9);
});

test('shows an explicit empty coach assignment state', async () => {
  vi.mocked(api.getPrivateCourse).mockResolvedValue({ ...course, coaches: [] });
  renderWithProviders(<PrivateCourseDetailPage />, { path: '/member/private-courses/:courseId', route: '/member/private-courses/9' });
  expect(await screen.findByText('Chưa có Coach được phân công')).toBeInTheDocument();
});
