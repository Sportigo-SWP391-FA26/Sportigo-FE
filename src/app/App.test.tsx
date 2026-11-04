import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import * as contentApi from '../features/content/api';

vi.mock('../features/content/api');

test('renders dashboard heading', async () => {
  vi.mocked(contentApi.getManagerDashboard).mockResolvedValue({
    activeMembers: 3,
    newMembersThisMonth: 1,
    classesToday: 2,
    roomsInUse: 1,
    totalRooms: 4,
    roomsInMaintenance: 0,
    monthlyRevenue: 1200000,
    previousMonthRevenue: 1000000,
    pendingRefunds: 0,
    openSupportRequests: 1,
    pendingOrders: 2,
    classStatus: { OPEN: 2 },
    trend: [{ month: 'Thg 10', revenue: 1200000, registrations: 3 }],
    upcomingSessions: [],
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter><QueryClientProvider client={queryClient}><DashboardPage /></QueryClientProvider></MemoryRouter>);
  expect(
    await screen.findByRole('heading', { name: 'Trung tâm hôm nay' }),
  ).toBeInTheDocument();
});
