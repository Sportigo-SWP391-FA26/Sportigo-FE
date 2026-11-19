import { expect, test } from '@playwright/test';
import { useTestRole } from './helpers/auth';

test('opens login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Chào mừng trở lại với Sportigo/ })).toBeVisible();
});

test('member can move from home to class schedule and filter classes', async ({ page }) => {
  await useTestRole(page, 'MEMBER');
  const now = new Date();
  const startsAt = new Date(now.getTime() + 86_400_000).toISOString();
  const endsAt = new Date(now.getTime() + 90_000_000).toISOString();
  const yogaClass = {
    id: 12,
    name: 'Yoga Flow',
    description: 'Lớp yoga kiểm thử giao diện',
    capacity: 16,
    tuitionFee: '450000',
    status: 'OPEN',
    registrationOpenAt: new Date(now.getTime() - 86_400_000).toISOString(),
    registrationCloseAt: new Date(now.getTime() + 43_200_000).toISOString(),
    startDate: startsAt,
    endDate: new Date(now.getTime() + 2_592_000_000).toISOString(),
    sportId: 2,
    coachId: 8,
    sport: { id: 2, name: 'Yoga', imageUrl: '/images/landing/hero/yoga.webp' },
    coach: { user: { displayName: 'Coach An' } },
    sessions: [{ id: 21, startsAt, endsAt, room: { id: 3, name: 'Studio Yoga' } }],
    _count: { registrations: 4 },
  };
  await page.route('**/api/members/me/home', (route) => route.fulfill({ json: { success: true, data: {
    profile: { id: 999, displayName: 'Hội viên kiểm thử', avatarUrl: null },
    nextSession: { registrationId: 1, classId: 12, className: 'Yoga Flow', sport: yogaClass.sport, coach: { id: 8, displayName: 'Coach An', avatarUrl: null }, sessionId: 21, startsAt, endsAt, room: yogaClass.sessions[0].room },
    weekSchedule: [], recommendations: [yogaClass], activities: [],
  } } }));
  await page.route('**/api/users/me', (route) => route.fulfill({ json: { id: 999, displayName: 'Hội viên kiểm thử', email: 'member@example.test', role: 'MEMBER' } }));
  await page.route('**/api/notifications**', (route) => route.fulfill({ json: { items: [], total: 0, unreadCount: 0 } }));
  await page.route('**/api/sports**', (route) => route.fulfill({ json: [{ id: 2, name: 'Yoga', isActive: true }] }));
  await page.route('**/api/bookings/classes**', (route) => route.fulfill({ json: { success: true, data: { data: [yogaClass], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } } }));
  await page.goto('/member/home');
  await expect(page.getByRole('heading', { name: 'Yoga Flow', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Khám phá lớp khác' }).click();
  await expect(page).toHaveURL(/\/member\/classes/);
  await expect(page.getByText('Tìm lớp phù hợp', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Yoga Flow' })).toBeVisible();
});
