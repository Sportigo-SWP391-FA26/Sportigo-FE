import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CheckInHistoryPanel } from './CheckInHistoryPanel';

const { api } = vi.hoisted(() => ({ api: { checkInHistory: vi.fn(), myCheckInHistory: vi.fn() } }));
vi.mock('../api', () => ({ membershipApi: api }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

test('Member chỉ gọi lịch sử của mình và chuyển trang được', async () => {
  api.myCheckInHistory.mockImplementation((page: number) => Promise.resolve({
    items: [{ id: page, checkedInAt: '2026-11-10T01:00:00.000Z', method: 'QR', planName: 'Gói 3 tháng', checkedInBy: 'Lễ tân', member: { id: 7, displayName: 'An Nguyễn', memberCode: 'MEM-7' } }],
    page, limit: 10, total: 11,
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CheckInHistoryPanel memberOnly /></QueryClientProvider>);

  expect(await screen.findByText('Gói 3 tháng · Quét QR')).toBeInTheDocument();
  expect(screen.getByText((text) => text.includes('10/11/2026') && text.includes('08:00'))).toBeInTheDocument();
  expect(screen.queryByText('An Nguyễn')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(api.myCheckInHistory).toHaveBeenCalledWith(2, 10));
  expect(api.checkInHistory).not.toHaveBeenCalled();
});
