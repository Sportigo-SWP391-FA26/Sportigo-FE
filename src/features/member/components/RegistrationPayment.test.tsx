import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { financeApi } from '../../finance/api';
import { useMyProfile } from '../../profile/hooks/useMyProfile';
import { RegistrationPayment } from './RegistrationPayment';

vi.mock('../../finance/api', () => ({ financeApi: { order: vi.fn(), promotions: vi.fn(), wallet: vi.fn(), applyPromotion: vi.fn(), walletPay: vi.fn(), vnpay: vi.fn(), cash: vi.fn() } }));
vi.mock('../../profile/hooks/useMyProfile', () => ({ useMyProfile: vi.fn() }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

test('cash confirmation shows a waiting receipt without recording payment as Member', async () => {
  vi.mocked(financeApi.order).mockResolvedValue({
    id: 42, orderNumber: 'ORD-GC-42', status: 'PENDING_PAYMENT', originalAmount: '1000000', discountAmount: '0', finalAmount: '1000000', items: [], payments: [],
  });
  vi.mocked(financeApi.promotions).mockResolvedValue([]);
  vi.mocked(financeApi.wallet).mockResolvedValue({ balance: 0, transactions: [], total: 0 });
  vi.mocked(useMyProfile).mockReturnValue({ data: { displayName: 'Nguyễn An', member: { memberCode: 'MEM-42' } } } as ReturnType<typeof useMyProfile>);
  renderWithProviders(<RegistrationPayment orderId={42} />);

  fireEvent.click(await screen.findByRole('radio', { name: /Tiền mặt tại quầy/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thanh toán tại quầy' }));

  expect(screen.getByText('Chờ thanh toán tại quầy')).toBeInTheDocument();
  expect(screen.getByText('ORD-GC-42')).toBeInTheDocument();
  expect(screen.getByText('MEM-42')).toBeInTheDocument();
  expect(screen.getByText('Nguyễn An')).toBeInTheDocument();
  expect(financeApi.cash).not.toHaveBeenCalled();

  vi.mocked(financeApi.order).mockResolvedValue({
    id: 42, orderNumber: 'ORD-GC-42', status: 'PAID', originalAmount: '1000000', discountAmount: '0', finalAmount: '1000000', items: [], payments: [{ id: 9, amount: '1000000', status: 'SUCCESS', channel: 'COUNTER' }],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
  await waitFor(() => expect(screen.getByText('Thanh toán thành công')).toBeInTheDocument());
});
