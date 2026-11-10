import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CheckInPage } from './CheckInPage';

const { api } = vi.hoisted(() => ({
  api: { recentCheckIns: vi.fn(), checkIn: vi.fn(), plans: vi.fn(), sellToMember: vi.fn() },
}));

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  membershipApi: api,
  toCheckInFailure: (error: unknown) => error,
}));
vi.mock('../components/QrScannerPanel', () => ({ QrScannerPanel: () => null }));
vi.mock('../../../components/auth/session', () => ({ getSessionRole: () => 'RECEPTIONIST' }));

const member = { id: 7, memberCode: 'SG7K2P9X', displayName: 'An Nguyễn', avatarUrl: null };

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><CheckInPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

async function submitCode() {
  await userEvent.type(screen.getByLabelText('Mã thành viên'), 'sg7k2p9x');
  await userEvent.click(screen.getByRole('button', { name: 'Check-in' }));
}

describe('CheckInPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.recentCheckIns.mockResolvedValue([]);
    api.plans.mockResolvedValue([{ id: 1, name: 'Gói 1 tháng', durationMonths: 1, price: '300000', description: null, status: 'ACTIVE' }]);
  });

  test('nhập mã thành công thì hiện hội viên và hạn gói', async () => {
    api.checkIn.mockResolvedValue({ id: 1, method: 'MANUAL', checkedInAt: '2026-11-10T01:00:00.000Z', checkedInBy: 'Lễ tân', member, planName: 'Gói 3 tháng', endDate: '2027-02-09', alreadyCheckedIn: false, daysRemaining: 92 });
    setup();
    await submitCode();

    expect(await screen.findByText('Check-in thành công')).toBeInTheDocument();
    expect(api.checkIn.mock.calls[0]).toEqual(['sg7k2p9x', 'MANUAL']);
    expect(screen.getByText(/09\/02\/2027 · còn 92 ngày/)).toBeInTheDocument();
  });

  test('chưa có gói thì báo lý do và cho bán gói tại quầy', async () => {
    api.checkIn.mockRejectedValue({ code: 'NO_ACTIVE_MEMBERSHIP', message: 'Hội viên chưa có gói membership còn hiệu lực.', member });
    api.sellToMember.mockResolvedValue({ orderId: 5, orderNumber: 'ORD-MB-5', amount: '300000', expiresAt: '2026-11-10T01:15:00.000Z', subscriptionId: 9 });
    setup();
    await submitCode();

    expect(await screen.findByText('Hội viên chưa có gói membership còn hiệu lực.')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Gói 1 tháng/ }));
    await waitFor(() => expect(api.sellToMember).toHaveBeenCalledWith(7, 1));
    expect(await screen.findByText(/Đã tạo đơn ORD-MB-5/)).toBeInTheDocument();
  });
});
