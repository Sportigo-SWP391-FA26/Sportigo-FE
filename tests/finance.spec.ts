import { expect, test } from '@playwright/test';
import { useTestRole } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/members/me/wallet**', (route) => route.fulfill({ json: { balance: 250000, transactions: [], total: 0 } }));
  await page.route('**/api/payments**', (route) => route.fulfill({ json: { items: [{ id: 8, reference: 'WAL-8', amount: '150000', channel: 'WALLET', status: 'SUCCESS', createdAt: new Date().toISOString(), order: { id: 7, orderNumber: 'SO-7', invoice: { id: 3, invoiceNumber: 'INV-3' } }, paymentMethod: { name: 'Ví Sportigo' } }] } }));
  await page.route('**/api/reports/revenue**', (route) => route.fulfill({ json: { gross: 1000000, refunds: 100000, net: 900000, transactions: 4, byChannel: { ONLINE: 900000 } } }));
  await page.route('**/api/reports/classes**', (route) => route.fulfill({ json: [{ id: 1, name: 'Swimming Endurance', capacity: 20, confirmed: 15, waitlist: 2, occupancyRate: .75, attendanceRate: .9 }] }));
  await page.route('**/api/promotions**', (route) => route.fulfill({ json: [{ id: 1, code: 'SPORTIGO10', name: 'Ưu đãi khai trương', discountType: 'PERCENTAGE', discountValue: '10', status: 'ACTIVE' }] }));
  await page.route('**/api/refund-requests**', (route) => route.fulfill({ json: [{ id: 4, requestedAmount: '100000', reason: 'Dịch vụ đã hủy', status: 'REQUESTED', requestedAt: new Date().toISOString(), member: { user: { displayName: 'Nguyễn Văn A', email: 'member@test.local' } }, payment: { reference: 'PAY-4', order: { orderNumber: 'SO-4' } } }] }));
  await page.route('**/api/audit-logs**', (route) => route.fulfill({ json: { items: [{ id: 5, action: 'REFUND_COMPLETED', entityType: 'RefundRequest', entityId: 4, createdAt: new Date().toISOString(), actor: { displayName: 'Center Manager' } }], page: 1, limit: 20, total: 1, facets: { actions: ['REFUND_COMPLETED'], entityTypes: ['RefundRequest'] } } }));
  await page.route('**/api/orders/*/payments/cash', (route) => route.fulfill({ status: 201, json: { status: 'SUCCESS' } }));
  await page.route('**/api/payments/vnpay/return**', (route) => route.fulfill({ json: { valid: true, responseCode: '00', reference: 'VNP-1001' } }));
});

test('manager can view class operations report', async ({ page }) => {
  await useTestRole(page, 'CENTER_MANAGER');
  await page.goto('/app/operations-report');
  await expect(page.getByRole('heading', { name: 'Báo cáo vận hành lớp' })).toBeVisible();
  await expect(page.getByText('Swimming Endurance')).toBeVisible();
  await expect(page.getByText('75%', { exact: true })).toBeVisible();
});

test('member can view wallet and payment history', async ({ page }) => {
  await useTestRole(page, 'MEMBER');
  await page.goto('/member/payments');
  await expect(page.getByRole('heading', { name: 'Thanh toán & ví Sportigo' })).toBeVisible();
  await expect(page.getByText('250.000 ₫')).toBeVisible();
  await expect(page.getByText('SO-7')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải hóa đơn' })).toBeVisible();
});

test('manager can view net revenue', async ({ page }) => {
  await useTestRole(page, 'CENTER_MANAGER');
  await page.goto('/app/revenue');
  await expect(page.getByRole('heading', { name: 'Báo cáo doanh thu' })).toBeVisible();
  await expect(page.getByText('900.000 ₫', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xuất Excel' })).toBeVisible();
});

test('receptionist can record a cash payment', async ({ page }) => {
  await useTestRole(page, 'RECEPTIONIST');
  await page.goto('/app/cashier');
  await page.getByLabel('Mã giao dịch').fill('42');
  await page.getByLabel('Số tiền đã nhận').fill('500000');
  await page.getByRole('button', { name: 'Xác nhận đã thu tiền' }).click();
  await expect(page.getByText('Đã ghi nhận thanh toán tiền mặt và phát hành hóa đơn.')).toBeVisible();
});

test('manager can inspect promotions, refunds and audit trail', async ({ page }) => {
  await useTestRole(page, 'CENTER_MANAGER');
  await page.goto('/app/promotions');
  await expect(page.getByText('SPORTIGO10')).toBeVisible();
  await expect(page.getByText('Ưu đãi khai trương')).toBeVisible();

  await page.goto('/app/refunds');
  await expect(page.getByText('Nguyễn Văn A')).toBeVisible();
  await expect(page.getByText('Dịch vụ đã hủy')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt' })).toBeVisible();

  await page.goto('/app/audit-logs');
  await expect(page.getByRole('table').getByText('Hoàn tất hoàn tiền')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Hoàn tất hoàn tiền' }).getByText('Center Manager')).toBeVisible();
});

test('member sees a successful VNPay return', async ({ page }) => {
  await useTestRole(page, 'MEMBER');
  await page.goto('/member/payments/result?vnp_ResponseCode=00&vnp_TxnRef=VNP-1001');
  await expect(page.getByRole('heading', { name: 'Thanh toán thành công' })).toBeVisible();
  await expect(page.getByText('Mã tham chiếu: VNP-1001')).toBeVisible();
});
