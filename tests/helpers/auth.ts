import type { Page } from '@playwright/test';

type TestRole = 'CENTER_MANAGER' | 'RECEPTIONIST' | 'MEMBER' | 'COACH';

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * Browser-only session fixture. API authorization is still covered by backend
 * integration tests; UI E2E routes their API calls to deterministic fixtures.
 */
export async function useTestRole(page: Page, role: TestRole) {
  const token = `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: 999, role })}.e2e`;
  await page.addInitScript((accessToken) => localStorage.setItem('accessToken', accessToken), token);
}
