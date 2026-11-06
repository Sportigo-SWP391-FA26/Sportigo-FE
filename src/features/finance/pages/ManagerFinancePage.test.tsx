import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { financeApi, saveBlob } from '../api';
import { ManagerFinancePage } from './ManagerFinancePage';

vi.mock('../api', () => ({
  financeApi: {
    revenue: vi.fn(), revenueExcel: vi.fn(), reportFile: vi.fn(), classReport: vi.fn(), promotions: vi.fn(), refunds: vi.fn(),
    updatePromotion: vi.fn(), createPromotion: vi.fn(), reviewRefund: vi.fn(), completeRefund: vi.fn(),
  },
  saveBlob: vi.fn(),
}));
vi.mock('../../../components/feedback/toast', () => ({ toast: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const report = {
  period: { from: '2026-11-01T00:00:00.000Z', to: '2026-11-30T23:59:59.999Z' },
  filters: { channel: null, itemType: null },
  gross: 1_000_000, discount: 100_000, refunds: 50_000, net: 950_000, transactions: 2, walletTopUps: 200_000,
  byChannel: { ONLINE: 950_000 }, byService: {},
};

test('uses the same filters for dashboard and financial Excel export', async () => {
  vi.mocked(financeApi.revenue).mockResolvedValue(report);
  vi.mocked(financeApi.revenueExcel).mockResolvedValue(new Blob(['xlsx']));
  renderWithProviders(<ManagerFinancePage view="revenue" />);

  expect(await screen.findByText('1.000.000 ₫')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Kênh thanh toán'), { target: { value: 'COUNTER' } });
  await waitFor(() => expect(financeApi.revenue).toHaveBeenLastCalledWith(expect.objectContaining({
    channel: 'COUNTER',
    from: expect.stringContaining('T17:00:00.000Z'),
    to: expect.stringContaining('T16:59:59.999Z'),
  })));

  fireEvent.click(screen.getByRole('button', { name: 'Xuất báo cáo Excel' }));
  await waitFor(() => expect(financeApi.revenueExcel).toHaveBeenCalledWith(expect.objectContaining({ channel: 'COUNTER' })));
  expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^Sportigo_BaoCaoTaiChinh_/));
});

test('blocks export when the date range is invalid', async () => {
  vi.mocked(financeApi.revenue).mockResolvedValue(report);
  renderWithProviders(<ManagerFinancePage view="revenue" />);
  await screen.findByText('1.000.000 ₫');
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-12-15' } });
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-12-01' } });
  expect(screen.getByText('Ngày kết thúc phải từ ngày bắt đầu trở đi.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xuất báo cáo Excel' })).toBeDisabled();
});
