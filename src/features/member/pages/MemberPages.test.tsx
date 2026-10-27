import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemberNavbar } from '../components/MemberNavbar';
import { ClassSchedulePage } from './ClassSchedulePage';
import { MemberHomePage } from './MemberHomePage';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as bookingApi from '../bookingApi';
import * as trainingApi from '../../training/api';

vi.mock('@lucasmarkes/hairline/react', () => ({
  Terrain: (props: { play?: boolean }) => <div data-testid="terrain" data-play={String(props.play)} />,
  Rail: (props: { play?: boolean }) => <div data-testid="rail" data-play={String(props.play)} />,
}));
vi.mock('../bookingApi');
vi.mock('../../training/api');

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

afterEach(cleanup);

// Navbar đọc tên từ useMyProfile (FR-05) nên cần QueryClient; bọc cả trang Home để sẵn sàng khi Home dùng API
function withProviders(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('member pages', () => {
  test('renders the calm member home with reduced Hairline motion', () => {
    render(<MemberHomePage />, { wrapper: withProviders('/member/home') });
    expect(screen.getByText(/Chào buổi sáng/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Swimming Endurance', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem chi tiết/ })).toHaveAttribute('href', '/member/classes');
    expect(screen.getByRole('link', { name: 'Khám phá lớp khác' })).toHaveAttribute('href', '/member/classes');
    expect(screen.getByTestId('terrain')).toHaveAttribute('data-play', 'false');
  });

  test('uses the overlay navigation variant on member home', () => {
    render(<MemberNavbar />, { wrapper: withProviders('/member/home') });
    expect(screen.getByRole('banner')).toHaveClass('member-nav--overlay');
  });

  test('marks the active member navigation route', () => {
    render(<MemberNavbar />, { wrapper: withProviders('/member/classes') });
    expect(screen.getByRole('link', { name: 'Lịch lớp' })).toHaveClass('active');
  });

  test('shows API-backed public classes with detail links', async () => {
    vi.mocked(bookingApi.getPublicClasses).mockResolvedValue({
      data: [{
        id: 8,
        sportId: 2,
        coachId: 12,
        name: 'Bơi cơ bản',
        description: null,
        capacity: 12,
        tuitionFee: 500000,
        registrationOpenAt: '2026-10-01T00:00:00.000Z',
        registrationCloseAt: '2026-11-01T00:00:00.000Z',
        startDate: '2026-11-05T00:00:00.000Z',
        endDate: '2026-12-01T00:00:00.000Z',
        status: 'OPEN',
        sport: { id: 2, name: 'Bơi lội', isActive: true },
        coach: { user: { id: 12, displayName: 'Coach An' } },
        _count: { registrations: 4 },
      }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    vi.mocked(trainingApi.getSports).mockResolvedValue([{ id: 2, name: 'Bơi lội', isActive: true }]);
    renderWithProviders(<ClassSchedulePage />);
    expect(await screen.findByText('Bơi cơ bản')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute('href', '/member/classes/8');
    fireEvent.change(screen.getByLabelText('Môn thể thao'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Coach'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Ngày lớp diễn ra'), { target: { value: '2026-11-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc lớp' }));
    await waitFor(() => expect(bookingApi.getPublicClasses).toHaveBeenLastCalledWith({
      page: 1, limit: 10, sportId: 2, coachId: 12, date: '2026-11-15',
    }));
  });
});
