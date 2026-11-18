import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('NotFoundPage', () => {
  it('offers a working public home link', () => {
    render(<MemoryRouter initialEntries={['/missing']}><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Trang này không có trong lịch/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Về trang chủ/i })).toHaveAttribute('href', '/');
  });
});
