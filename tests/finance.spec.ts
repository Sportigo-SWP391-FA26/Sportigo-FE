import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/api/members/me/wallet**', (route) => route.fulfill({ json: { balance: 250000, transactions: [], total: 0 } }));
  await page.route('http://localhost:3000/api/payments**', (route) => route.fulfill({ json: { items: [{ id: 8, reference: 'WAL-8', amount: '150000', channel: 'WALLET', status: 'SUCCESS', createdAt: new Date().toISOString(), order: { id: 7, orderNumber: 'SO-7', invoice: { id: 3, invoiceNumber: 'INV-3' } }, paymentMethod: { name: 'Ví Sportigo' } }] } }));
  await page.route('http://localhost:3000/api/reports/revenue**', (route) => route.fulfill({ json: { gross: 1000000, refunds: 100000, net: 900000, transactions: 4, byChannel: { ONLINE: 900000 } } }));
});

test('member can view wallet and payment history', async ({ page }) => {
  await page.goto('/member/payments');
  await expect(page.getByRole('heading', { name: 'Thanh toán & ví Sportigo' })).toBeVisible();
  await expect(page.getByText('250.000 ₫')).toBeVisible();
  await expect(page.getByText('SO-7')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tải hóa đơn' })).toBeVisible();
});

test('manager can view net revenue', async ({ page }) => {
  await page.goto('/app/revenue');
  await expect(page.getByRole('heading', { name: 'Báo cáo doanh thu' })).toBeVisible();
  await expect(page.getByText('900.000 ₫')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xuất Excel' })).toBeVisible();
});
