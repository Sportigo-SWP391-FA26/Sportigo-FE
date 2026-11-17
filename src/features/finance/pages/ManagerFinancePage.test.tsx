import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { financeApi, saveBlob } from '../api';
import { ManagerFinancePage } from './ManagerFinancePage';

vi.mock('../api', () => ({
  financeApi: {
    revenue: vi.fn(), revenueAnalytics: vi.fn(), revenueExcel: vi.fn(), reportFile: vi.fn(), classReport: vi.fn(), promotions: vi.fn(), refunds: vi.fn(),
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

beforeEach(() => {
  const metrics = { gross: 1_000_000, refunds: 50_000, net: 950_000, transactions: 2, averageTransaction: 500_000, refundRate: .05 };
  vi.mocked(financeApi.revenueAnalytics).mockResolvedValue({ period: 'MONTH', anchor: '2026-11-01', range: { from: '2026-11-01', to: '2026-11-18' }, current: metrics, previous: { ...metrics, from: '2026-10-01' }, yearAgo: { ...metrics, from: '2025-11-01' }, change: { previous: 0, yearAgo: 0 }, trend: [{ ...metrics, periodStart: '2026-11-01' }] });
});

test('uses the same filters for dashboard and financial Excel export', async () => {
  vi.mocked(financeApi.revenue).mockResolvedValue(report);
  vi.mocked(financeApi.revenueExcel).mockResolvedValue(new Blob(['xlsx']));
  renderWithProviders(<ManagerFinancePage view="revenue" />);

  expect((await screen.findAllByText('1.000.000 ₫')).length).toBeGreaterThan(0);
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
  await screen.findAllByText('1.000.000 ₫');
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-12-15' } });
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-12-01' } });
  expect(screen.getByText('Ngày kết thúc phải từ ngày bắt đầu trở đi.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xuất báo cáo Excel' })).toBeDisabled();
});

test('switches trend and report to the same quarter', async () => {
  vi.mocked(financeApi.revenue).mockResolvedValue(report);
  renderWithProviders(<ManagerFinancePage view="revenue" />);
  await screen.findAllByText('1.000.000 ₫');
  fireEvent.click(screen.getByRole('button', { name: 'Quý' }));
  await waitFor(() => expect(financeApi.revenueAnalytics).toHaveBeenLastCalledWith(expect.objectContaining({ period: 'QUARTER' })));
  await waitFor(() => expect(financeApi.revenue).toHaveBeenLastCalledWith(expect.objectContaining({ from: expect.stringContaining('T17:00:00.000Z') })));
});
