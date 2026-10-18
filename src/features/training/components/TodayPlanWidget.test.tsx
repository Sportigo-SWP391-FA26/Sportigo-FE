import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api';
import { memberAssignment } from '../testing/fixtures';
import { renderWithProviders } from '../testing/renderWithProviders';
import { NO_PLAN_MESSAGE, TodayPlanWidget } from './TodayPlanWidget';

vi.mock('../api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('TodayPlanWidget (FR-53)', () => {
  test('hiện hướng dẫn khi Member chưa được gán giáo án', async () => {
    vi.mocked(api.getMyTraining).mockResolvedValue({ planAssignments: [], assessments: [] });
    renderWithProviders(<TodayPlanWidget />);
    expect(await screen.findByText(NO_PLAN_MESSAGE)).toBeInTheDocument();
  });

  test('bỏ qua giáo án đã kết thúc khi tìm giáo án đang áp dụng', async () => {
    vi.mocked(api.getMyTraining).mockResolvedValue({
      planAssignments: [memberAssignment({ status: 'COMPLETED' })],
      assessments: [],
    });
    renderWithProviders(<TodayPlanWidget />);
    expect(await screen.findByText(NO_PLAN_MESSAGE)).toBeInTheDocument();
  });

  test('hiển thị mục của tuần hiện tại và chuyển giữa các buổi', async () => {
    vi.mocked(api.getMyTraining).mockResolvedValue({ planAssignments: [memberAssignment()], assessments: [] });
    renderWithProviders(<TodayPlanWidget />);

    expect(await screen.findByText('Tuần 2 / 4')).toBeInTheDocument();
    expect(screen.getByText('Lướt nước')).toBeInTheDocument();
    expect(screen.getByText('4 hiệp')).toBeInTheDocument();
    expect(screen.queryByText('Khởi động')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Buổi 2' }));
    expect(screen.getByText('Phối hợp tay chân')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem toàn bộ/ })).toHaveAttribute('href', '/member/training-plan?assignment=7');
  });
});
