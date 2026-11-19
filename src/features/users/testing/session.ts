import type { AppRole } from '../../../components/auth/session';

/** Ghi một access token giả có role vào localStorage để getSessionRole() đọc được trong test */
export function loginAs(role: AppRole) {
  const payload = btoa(JSON.stringify({ role, sub: '1' }));
  localStorage.setItem('accessToken', `header.${payload}.signature`);
}
