import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';

test('renders dashboard heading', () => {
  render(<DashboardPage />, { wrapper: MemoryRouter });
  expect(
    screen.getByRole('heading', { name: 'Dashboard' }),
  ).toBeInTheDocument();
});
