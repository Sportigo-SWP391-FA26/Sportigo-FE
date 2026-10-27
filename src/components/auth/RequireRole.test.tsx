import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireRole } from './RequireRole';
import { loginAs } from '../../features/users/testing/session';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderProtected(role: 'CENTER_MANAGER' | 'MEMBER') {
  loginAs(role);
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<RequireRole roles={['CENTER_MANAGER']} />}>
          <Route path="/protected" element={<p>Thao tác quản trị</p>} />
        </Route>
        <Route path="/member/home" element={<p>Trang Member</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('manager can enter a manager-only route', () => {
  renderProtected('CENTER_MANAGER');
  expect(screen.getByText('Thao tác quản trị')).toBeInTheDocument();
});

test('a Member is redirected away from a manager-only route', async () => {
  renderProtected('MEMBER');
  expect(await screen.findByText('Trang Member')).toBeInTheDocument();
  expect(screen.queryByText('Thao tác quản trị')).not.toBeInTheDocument();
});
