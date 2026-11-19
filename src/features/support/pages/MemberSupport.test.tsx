import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { axiosError } from '../../training/testing/axiosError';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import type { SupportRequestDetail } from '../types';
import { MemberSupportDetailPage } from './MemberSupportDetailPage';
import { MemberSupportPage } from './MemberSupportPage';

vi.mock('../api');

const member = { id: 5, displayName: 'Trần Bình', role: 'MEMBER' };
const staff = { id: 3, displayName: 'Lễ tân Mai', role: 'RECEPTIONIST' };

const detail: SupportRequestDetail = {
  id: 11,
  subject: 'Không thanh toán được',
  category: 'PAYMENT',
  priority: 'HIGH',
  status: 'IN_PROGRESS',
  createdAt: '2026-10-25T03:00:00.000Z',
  resolvedAt: null,
  requester: member,
  assignee: staff,
  messageCount: 2,
  description: 'Thanh toán VNPay bị lỗi khi đăng ký lớp yoga',
  messages: [
    { id: 1, content: 'Bạn gửi giúp mã đơn nhé', isInternal: false, sentAt: '2026-10-25T03:05:00.000Z', sender: staff },
    { id: 2, content: 'Mã đơn là 123', isInternal: false, sentAt: '2026-10-25T03:06:00.000Z', sender: member },
  ],
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const renderDetail = () => renderWithProviders(<MemberSupportDetailPage />, { path: '/member/support/:requestId', route: '/member/support/11' });

describe('Yêu cầu hỗ trợ của Member (FR-55)', () => {
  test('danh sách hiển thị trạng thái, ưu tiên và người phụ trách', async () => {
    vi.mocked(api.listSupportRequests).mockResolvedValue({ items: [detail], page: 1, pageSize: 10, total: 1 });
    renderWithProviders(<MemberSupportPage />);

    const link = await screen.findByRole('link', { name: /Không thanh toán được/ });
    expect(link).toHaveAttribute('href', '/member/support/11');
    expect(within(link).getByText('Đang xử lý')).toBeInTheDocument();
    expect(within(link).getByText('Cao')).toBeInTheDocument();
    expect(within(link).getByText(/Phụ trách: Lễ tân Mai/)).toBeInTheDocument();
  });

  test('gửi yêu cầu mới: kiểm tra dữ liệu rồi gửi đúng body', async () => {
    vi.mocked(api.listSupportRequests).mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
    vi.mocked(api.createSupportRequest).mockResolvedValue({ ...detail, status: 'OPEN', messages: [] });
    renderWithProviders(<MemberSupportPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gửi yêu cầu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Gửi yêu cầu hỗ trợ' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    expect(await within(dialog).findByText('Chủ đề cần ít nhất 5 ký tự')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Chủ đề/), { target: { value: 'Không thanh toán được' } });
    fireEvent.change(within(dialog).getByLabelText(/Loại yêu cầu/), { target: { value: 'PAYMENT' } });
    fireEvent.change(within(dialog).getByLabelText(/Mức ưu tiên/), { target: { value: 'HIGH' } });
    fireEvent.change(within(dialog).getByLabelText(/Nội dung/), { target: { value: 'Thanh toán VNPay bị lỗi khi đăng ký lớp yoga' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() =>
      expect(api.createSupportRequest).toHaveBeenCalledWith({
        subject: 'Không thanh toán được',
        category: 'PAYMENT',
        priority: 'HIGH',
        description: 'Thanh toán VNPay bị lỗi khi đăng ký lớp yoga',
      }),
    );
    // note: tạo xong chuyển sang trang chi tiết (route test chỉ có "/" nên rơi vào trang khác)
    expect(await screen.findByText('Trang khác')).toBeInTheDocument();
  });

  test('chi tiết: tin của mình ghi "Bạn", gửi thêm tin nhắn', async () => {
    vi.mocked(api.getSupportRequest).mockResolvedValue(detail);
    vi.mocked(api.sendSupportMessage).mockResolvedValue(detail);
    renderDetail();

    expect(await screen.findByText('Bạn gửi giúp mã đơn nhé')).toBeInTheDocument();
    const messages = within(screen.getByRole('list', { name: 'Tin nhắn' })).getAllByRole('listitem');
    expect(within(messages[0]).getByText('Lễ tân Mai')).toBeInTheDocument();
    expect(within(messages[1]).getByText('Bạn')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nội dung tin nhắn'), { target: { value: '  Em đã thử lại  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await waitFor(() => expect(api.sendSupportMessage).toHaveBeenCalledWith(11, 'Em đã thử lại'));
    await waitFor(() => expect(screen.getByLabelText('Nội dung tin nhắn')).toHaveValue(''));
  });

  test('lỗi gửi tin nhắn giữ nguyên nội dung và hiện thông báo', async () => {
    vi.mocked(api.getSupportRequest).mockResolvedValue(detail);
    vi.mocked(api.sendSupportMessage).mockRejectedValue(axiosError(409, { code: 'REQUEST_CLOSED', message: 'Yêu cầu đã đóng, vui lòng gửi yêu cầu mới' }));
    renderDetail();

    fireEvent.change(await screen.findByLabelText('Nội dung tin nhắn'), { target: { value: 'Còn đó không?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    expect(await screen.findByText('Yêu cầu đã đóng, vui lòng gửi yêu cầu mới')).toBeInTheDocument();
    expect(screen.getByLabelText('Nội dung tin nhắn')).toHaveValue('Còn đó không?');
  });

  test('yêu cầu đã đóng thì không có ô nhắn tin và không có nút hủy', async () => {
    vi.mocked(api.getSupportRequest).mockResolvedValue({ ...detail, status: 'CLOSED' });
    renderDetail();
    expect(await screen.findByText(/Yêu cầu đã đóng/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nội dung tin nhắn')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy yêu cầu' })).not.toBeInTheDocument();
  });

  test('hủy yêu cầu sau khi xác nhận', async () => {
    vi.mocked(api.getSupportRequest).mockResolvedValue(detail);
    vi.mocked(api.cancelSupportRequest).mockResolvedValue({ ...detail, status: 'CANCELLED' });
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy yêu cầu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hủy yêu cầu hỗ trợ?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy yêu cầu' }));
    await waitFor(() => expect(api.cancelSupportRequest).toHaveBeenCalledWith(11));
  });
});
