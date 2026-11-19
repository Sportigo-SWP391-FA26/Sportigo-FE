import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as profileApi from '../../profile/api';
import type { MyProfile } from '../../profile/types';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as usersApi from '../../users/api';
import { loginAs } from '../../users/testing/session';
import * as api from '../api';
import type { StaffSupportDetail } from '../types';
import { StaffSupportDetailPage } from './StaffSupportDetailPage';
import { SupportQueuePage } from './SupportQueuePage';

vi.mock('../api');
vi.mock('../../users/api');
vi.mock('../../profile/api');

const ME = 3;
const member = { id: 5, displayName: 'Trần Bình', role: 'MEMBER' };
const mai = { id: ME, displayName: 'Lễ tân Mai', role: 'RECEPTIONIST' };

const profile = (id: number, role: MyProfile['role']): MyProfile => ({
  id,
  email: 'staff@sportigo.vn',
  phone: null,
  displayName: 'Nhân viên',
  role,
  status: 'ACTIVE',
  emailVerifiedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  member: null,
  coach: null,
});

const detail = (overrides: Partial<StaffSupportDetail> = {}): StaffSupportDetail => ({
  id: 11,
  subject: 'Không thanh toán được',
  category: 'PAYMENT',
  priority: 'HIGH',
  status: 'OPEN',
  createdAt: '2026-10-25T03:00:00.000Z',
  resolvedAt: null,
  requester: member,
  assignee: null,
  messageCount: 1,
  description: 'Thanh toán VNPay bị lỗi',
  messages: [{ id: 1, content: 'Ghi chú: kiểm tra VNPay', isInternal: true, sentAt: '2026-10-25T03:05:00.000Z', sender: mai }],
  history: [],
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

function renderDetail(role: 'RECEPTIONIST' | 'CENTER_MANAGER', data: StaffSupportDetail) {
  loginAs(role);
  vi.mocked(profileApi.getMyProfile).mockResolvedValue(profile(role === 'RECEPTIONIST' ? ME : 1, role));
  vi.mocked(api.getStaffSupportRequest).mockResolvedValue(data);
  return renderWithProviders(<StaffSupportDetailPage />, { path: '/app/support/:requestId', route: '/app/support/11' });
}

describe('Xử lý yêu cầu hỗ trợ (FR-56)', () => {
  test('hàng đợi hiển thị yêu cầu, lọc "Của tôi" gửi mine=true', async () => {
    loginAs('RECEPTIONIST');
    vi.mocked(api.listSupportQueue).mockResolvedValue({ items: [detail()], page: 1, pageSize: 20, total: 1 });
    renderWithProviders(<SupportQueuePage />);

    expect(await screen.findByRole('link', { name: 'Không thanh toán được' })).toHaveAttribute('href', '/app/support/11');
    expect(screen.getByRole('cell', { name: 'Trần Bình' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Của tôi'));
    await waitFor(() => expect(api.listSupportQueue).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true })));
  });

  test('Receptionist nhận xử lý yêu cầu chưa có người phụ trách', async () => {
    vi.mocked(api.updateSupportRequest).mockResolvedValue(detail({ status: 'ASSIGNED', assignee: mai }));
    renderDetail('RECEPTIONIST', detail());

    fireEvent.click(await screen.findByRole('button', { name: 'Nhận xử lý' }));
    await waitFor(() => expect(api.updateSupportRequest).toHaveBeenCalledWith(11, { assigneeId: ME }));
    // note: sau khi nhận, trang dùng chi tiết mới trả về → hiện nút chuyển trạng thái
    expect(await screen.findByRole('button', { name: 'Bắt đầu xử lý' })).toBeInTheDocument();
  });

  test('người phụ trách chuyển trạng thái và thấy tin nhắn nội bộ', async () => {
    vi.mocked(api.updateSupportRequest).mockResolvedValue(detail({ status: 'RESOLVED', assignee: mai }));
    renderDetail('RECEPTIONIST', detail({ status: 'IN_PROGRESS', assignee: mai }));

    expect(await screen.findByText('Ghi chú nội bộ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã giải quyết' }));
    await waitFor(() => expect(api.updateSupportRequest).toHaveBeenCalledWith(11, { status: 'RESOLVED' }));
    expect(await screen.findByRole('button', { name: 'Đóng yêu cầu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở lại' })).toBeInTheDocument();
  });

  test('gửi ghi chú nội bộ kèm isInternal=true', async () => {
    vi.mocked(api.sendStaffMessage).mockResolvedValue(detail({ status: 'IN_PROGRESS', assignee: mai }));
    renderDetail('RECEPTIONIST', detail({ status: 'IN_PROGRESS', assignee: mai }));

    fireEvent.change(await screen.findByLabelText('Nội dung tin nhắn'), { target: { value: 'Đã báo kế toán' } });
    fireEvent.click(screen.getByLabelText(/Ghi chú nội bộ \(hội viên không thấy\)/));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await waitFor(() => expect(api.sendStaffMessage).toHaveBeenCalledWith(11, 'Đã báo kế toán', true));
  });

  test('Manager giao việc cho lễ tân từ danh sách', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [
        { id: ME, email: 'mai@sportigo.vn', phone: null, displayName: 'Lễ tân Mai', role: 'RECEPTIONIST', status: 'ACTIVE', code: 'REC-01', emailVerified: true, createdAt: '2026-10-01T00:00:00.000Z' },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });
    vi.mocked(api.updateSupportRequest).mockResolvedValue(detail({ status: 'ASSIGNED', assignee: mai }));
    renderDetail('CENTER_MANAGER', detail());

    expect(screen.queryByRole('button', { name: 'Nhận xử lý' })).not.toBeInTheDocument();
    const select = await screen.findByLabelText('Giao cho lễ tân');
    await within(select).findByRole('option', { name: 'Lễ tân Mai' });
    fireEvent.change(select, { target: { value: String(ME) } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.updateSupportRequest).toHaveBeenCalledWith(11, { assigneeId: ME }));
    expect(usersApi.listUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'RECEPTIONIST', status: 'ACTIVE' }));
  });
});
