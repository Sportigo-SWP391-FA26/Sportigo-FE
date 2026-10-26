import { expect, test } from '@playwright/test';

test('opens login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Chào mừng trở lại với Sportigo/ })).toBeVisible();
});

test('member can move from home to class schedule and filter classes', async ({ page }) => {
  await page.goto('/member/home');
  await expect(page.getByRole('heading', { name: 'Swimming Endurance', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /Xem chi tiết/ }).click();
  await expect(page).toHaveURL(/\/member\/classes/);
  await page.getByLabel('Lọc theo môn').selectOption('Yoga');
  await expect(page.getByRole('button', { name: /Yoga Flow/ })).toBeVisible();
  await page.getByRole('button', { name: /Yoga Flow/ }).click();
  await expect(page.getByRole('heading', { name: 'Yoga Flow' })).toBeVisible();
});
