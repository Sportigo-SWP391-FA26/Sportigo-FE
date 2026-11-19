import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renderWithProviders } from '../../features/training/testing/renderWithProviders';
import { loginAs } from '../../features/users/testing/session';
import type { AppRole } from '../auth/session';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo navigation', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  test('sends guests to the landing page', () => {
    renderWithProviders(<BrandLogo />);
    expect(screen.getByRole('link', { name: 'Sportigo - Trang chủ' })).toHaveAttribute('href', '/');
  });

  test.each<[AppRole, string]>([
    ['MEMBER', '/member/home'],
    ['COACH', '/coach/dashboard'],
    ['RECEPTIONIST', '/app/cashier'],
    ['CENTER_MANAGER', '/app/dashboard'],
  ])('sends %s to its role home', (role, expectedPath) => {
    loginAs(role);
    renderWithProviders(<BrandLogo />);
    expect(screen.getByRole('link', { name: 'Sportigo - Trang chủ' })).toHaveAttribute('href', expectedPath);
  });
});
