import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { StaffPerformance } from '../performanceTypes';
import { StaffPerformancePage } from './StaffPerformancePage';

// note: giả lập API, test chỉ kiểm tra giao diện hiển thị đúng số liệu backend trả
vi.mock('../api');

const data: StaffPerformance = {
  from: '2026-10-01',
  to: '2026-10-31',
  totals: { groupSessionsHeld: 12, privateSessions: 7, supportResolved: 5, cashCollected: 1500000, membersCreated: 3 },
  coaches: [
    { id: 7, displayName: 'Coach Lan', email: 'lan@x.vn', avatarUrl: null, staffCode: 'COA-000007', accountStatus: 'ACTIVE', coachStatus: 'ACTIVE', groupSessionsHeld: 4, groupSessionsMarked: 4, privateSessions: 2, attendanceRate: 0.75, assessments: 1, activeTrainees: 3 },
    { id: 8, displayName: 'Coach Hùng', email: 'hung@x.vn', avatarUrl: null, staffCode: 'COA-000008', accountStatus: 'LOCKED', coachStatus: 'ACTIVE', groupSessionsHeld: 8, groupSessionsMarked: 6, privateSessions: 5, attendanceRate: null, assessments: 0, activeTrainees: 1 },
  ],
  receptionists: [
    { id: 3, displayName: 'Lễ tân Mai', email: 'mai@x.vn', avatarUrl: null, staffCode: 'REC-000003', accountStatus: 'ACTIVE', supportResolved: 5, supportInProgress: 1, avgResolutionHours: 3.5, cashCollected: 1500000, cashPayments: 3, membersCreated: 3 },
  ],
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const renderPage = (route = '/app/staff-performance?from=2026-10-01&to=2026-10-31') =>
  renderWithProviders(<StaffPerformancePage />, { path: '/app/staff-performance', route });

// note: lấy tên các dòng trong bảng theo thứ tự hiển thị để kiểm tra sắp xếp
const rowNames = () => screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].querySelector('p')?.textContent);

describe('Hiệu suất nhân sự (FR-65)', () => {
  test('gọi API theo khoảng ngày trên URL và hiện ô tổng', async () => {
    vi.mocked(api.getStaffPerformance).mockResolvedValue(data);
    renderPage();

    expect(await screen.findByText('Buổi lớp nhóm đã dạy')).toBeInTheDocument();
    expect(api.getStaffPerformance).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-31' });
    expect(screen.getByText(/Số liệu từ 01\/10\/2026 đến 31\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('bảng Coach: sắp theo buổi lớp giảm dần, nhắc buổi chưa điểm danh, tỷ lệ trống hiện "—"', async () => {
    vi.mocked(api.getStaffPerformance).mockResolvedValue(data);
    renderPage();
    await screen.findByText('Coach Hùng');

    expect(rowNames()).toEqual(['Coach Hùng', 'Coach Lan']);
    expect(screen.getByText('Chưa điểm danh 2')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    // note: tài khoản bị khóa có nhãn trạng thái
    expect(screen.getByText('Đã khóa')).toBeInTheDocument();

    // note: bấm cột "Tỷ lệ có mặt" → sắp giảm dần, Coach chưa có số liệu nằm cuối
    fireEvent.click(screen.getByRole('button', { name: /Tỷ lệ có mặt/ }));
    expect(rowNames()).toEqual(['Coach Lan', 'Coach Hùng']);
  });

  test('tab Lễ tân hiện yêu cầu đã xong, giờ xử lý trung bình, tiền thu tại quầy', async () => {
    vi.mocked(api.getStaffPerformance).mockResolvedValue(data);
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Lễ tân/ }));

    expect(screen.getByText('Lễ tân Mai')).toBeInTheDocument();
    expect(screen.getByText('3,5 giờ')).toBeInTheDocument();
    expect(screen.getByText('3 giao dịch')).toBeInTheDocument();
  });

  test('nhập từ ngày sau đến ngày thì báo lỗi, không gọi API với khoảng sai', async () => {
    vi.mocked(api.getStaffPerformance).mockResolvedValue(data);
    renderPage();
    await screen.findByText('Coach Lan');

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-05' } });
    expect(screen.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')).toBeInTheDocument();
    expect(api.getStaffPerformance).not.toHaveBeenCalledWith(expect.objectContaining({ from: '2026-11-05' }));

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-15' } });
    await waitFor(() => expect(api.getStaffPerformance).toHaveBeenLastCalledWith({ from: '2026-10-15', to: '2026-10-31' }));
  });

  test('API báo lỗi thì hiện thông báo và nút Thử lại', async () => {
    // note: dùng lỗi 400 vì hook tự thử lại 1 lần với lỗi 5xx, làm test chờ lâu
    vi.mocked(api.getStaffPerformance).mockRejectedValue(axiosError(400, { code: 'VALIDATION_ERROR', message: 'Chỉ xem được tối đa 366 ngày' }));
    renderPage();
    expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
    expect(screen.getByText('Chỉ xem được tối đa 366 ngày')).toBeInTheDocument();
  });
});
