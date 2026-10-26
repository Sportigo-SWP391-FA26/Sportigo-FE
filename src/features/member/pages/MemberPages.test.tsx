import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemberNavbar } from '../components/MemberNavbar';
import { ClassSchedulePage } from './ClassSchedulePage';
import { MemberHomePage } from './MemberHomePage';

vi.mock('@lucasmarkes/hairline/react', () => ({
  Terrain: (props: { play?: boolean }) => <div data-testid="terrain" data-play={String(props.play)} />,
  Rail: (props: { play?: boolean }) => <div data-testid="rail" data-play={String(props.play)} />,
}));

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

  test('filters schedules and disables registration for a full class', () => {
    render(<ClassSchedulePage />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByLabelText('Lọc theo môn'), { target: { value: 'Cầu lông' } });
    fireEvent.click(screen.getByRole('button', { name: /Badminton Skills/ }));
    expect(screen.getByRole('button', { name: 'Lớp đã đầy' })).toBeDisabled();
  });
});
