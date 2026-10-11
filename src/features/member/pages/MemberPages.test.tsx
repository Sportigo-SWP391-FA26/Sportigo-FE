import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

describe('member pages', () => {
  test('renders the calm member home with reduced Hairline motion', () => {
    render(<MemberHomePage />, { wrapper: MemoryRouter });
    expect(screen.getByText(/Chào buổi sáng/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Swimming Endurance', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem chi tiết/ })).toHaveAttribute('href', '/member/classes');
    expect(screen.getByRole('link', { name: 'Khám phá lớp khác' })).toHaveAttribute('href', '/member/classes');
    expect(screen.getByTestId('terrain')).toHaveAttribute('data-play', 'false');
  });

  test('uses the overlay navigation variant on member home', () => {
    render(<MemberNavbar />, { wrapper: ({ children }) => <MemoryRouter initialEntries={['/member/home']}>{children}</MemoryRouter> });
    expect(screen.getByRole('banner')).toHaveClass('member-nav--overlay');
  });

  test('marks the active member navigation route', () => {
    render(<MemberNavbar />, { wrapper: ({ children }) => <MemoryRouter initialEntries={['/member/classes']}>{children}</MemoryRouter> });
    expect(screen.getByRole('link', { name: 'Lịch lớp' })).toHaveClass('active');
  });

  test('filters schedules and disables registration for a full class', () => {
    render(<ClassSchedulePage />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByLabelText('Lọc theo môn'), { target: { value: 'Cầu lông' } });
    fireEvent.click(screen.getByRole('button', { name: /Badminton Skills/ }));
    expect(screen.getByRole('button', { name: 'Lớp đã đầy' })).toBeDisabled();
  });
});
