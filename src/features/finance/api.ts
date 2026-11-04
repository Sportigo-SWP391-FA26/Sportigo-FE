import { apiClient } from '../../api/client';

export type WalletTransaction = { id: number; type: string; amount: string; balanceAfter: string; description?: string; createdAt: string };
export type Wallet = { balance: number; transactions: WalletTransaction[]; total: number };
export type Payment = { id: number; reference: string; amount: string; channel: string; status: string; paidAt?: string; createdAt: string; order: { id: number; orderNumber: string; invoice?: { id: number; invoiceNumber: string } }; paymentMethod: { name: string } };
export type ServiceOrder = {
  id: number;
  orderNumber: string;
  status: string;
  originalAmount: string;
  discountAmount: string;
  finalAmount: string;
  expiresAt?: string | null;
  paidAt?: string | null;
  items: Array<{ id: number; itemNameSnapshot: string; itemType: string; finalAmount: string }>;
  payments: Array<{ id: number; amount: string; status: string; channel: string }>;
  promotion?: { id: number; code: string; name: string } | null;
};
export type Promotion = { id: number; code: string; name: string; discountType: string; discountValue: string; status: string; startAt: string; endAt: string };
export type RefundRequest = { id: number; requestedAmount: string; reason: string; status: string; requestedAt: string; member: { user: { displayName: string; email: string } }; payment: { reference: string; order: { orderNumber: string } } };
export type Revenue = { gross: number; refunds: number; net: number; transactions: number; byChannel: Record<string, number> };
export type AuditLogItem = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: { id: number; displayName: string; email: string } | null;
};
export type AuditQuery = { page: number; limit: number; action?: string; entityType?: string; from?: string; to?: string };
export type AuditPage = { items: AuditLogItem[]; page: number; limit: number; total: number; facets: { actions: string[]; entityTypes: string[] } };
export type ClassReportRow = { id: number; name: string; capacity: number; confirmed: number; waitlist: number; occupancyRate: number; attendanceRate: number };
export type CashOrderResult = { id: number; orderNumber: string; memberName: string; memberEmail: string; memberCode: string; itemNames: string[]; finalAmount: number; remainingAmount: number; expiresAt?: string | null };

export const financeApi = {
  order: (id: number) => apiClient.get<ServiceOrder>(`/orders/${id}`).then((r) => r.data),
  applyPromotion: (orderId: number, code: string) => apiClient.post<ServiceOrder>(`/orders/${orderId}/promotion`, { code }).then((r) => r.data),
  wallet: () => apiClient.get<Wallet>('/members/me/wallet').then((r) => r.data),
  payments: () => apiClient.get<{ items: Payment[] }>('/payments').then((r) => r.data.items),
  walletPay: (orderId: number, amount: number) => apiClient.post(`/orders/${orderId}/wallet-payments`, { amount }).then((r) => r.data),
  vnpay: (orderId: number) => apiClient.post<{ paymentUrl: string }>(`/orders/${orderId}/payments/vnpay`).then((r) => r.data),
  topUp: (amount: number) => apiClient.post<{ paymentUrl: string }>('/wallet/top-ups/vnpay', { amount }).then((r) => r.data),
  cash: (orderId: number, amount: number) => apiClient.post(`/orders/${orderId}/payments/cash`, { amount }).then((r) => r.data),
  searchCashOrders: (q: string) => apiClient.get<CashOrderResult[]>('/orders/cashier/search', { params: { q } }).then((r) => r.data),
  refund: (paymentId: number, requestedAmount: number, reason: string) => apiClient.post(`/payments/${paymentId}/refund-requests`, { requestedAmount, reason }).then((r) => r.data),
  promotions: () => apiClient.get<Promotion[]>('/promotions').then((r) => r.data),
  createPromotion: (data: Record<string, unknown>) => apiClient.post('/promotions', data).then((r) => r.data),
  updatePromotion: (id: number, data: Record<string, unknown>) => apiClient.patch(`/promotions/${id}`, data).then((r) => r.data),
  refunds: () => apiClient.get<RefundRequest[]>('/refund-requests').then((r) => r.data),
  reviewRefund: (id: number, decision: string, note: string, approvedAmount?: number) => apiClient.patch(`/refund-requests/${id}/review`, { decision, note, approvedAmount }).then((r) => r.data),
  completeRefund: (id: number) => apiClient.post(`/refund-requests/${id}/complete`).then((r) => r.data),
  revenue: () => apiClient.get<Revenue>('/reports/revenue').then((r) => r.data),
  audit: (params: AuditQuery) => apiClient.get<AuditPage>('/audit-logs', { params }).then((r) => r.data),
  classReport: () => apiClient.get<ClassReportRow[]>('/reports/classes').then((r) => r.data),
  verifyVnpayReturn: (query: string) => apiClient.get<{ valid: boolean; confirmed: boolean; paymentStatus: string; responseCode?: string; reference?: string }>(`/payments/vnpay/verify?${query}`).then((r) => r.data),
  invoicePdf: (id: number) => apiClient.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
  revenueExcel: () => apiClient.get<Blob>('/reports/revenue/export', { responseType: 'blob' }).then((r) => r.data),
  reportFile: (kind: 'revenue'|'classes', format: 'xlsx'|'pdf') => apiClient.get<Blob>(`/reports/${kind}/export`, { params: { format }, responseType: 'blob' }).then((r) => r.data),
};

export function saveBlob(blob: Blob, filename: string) { const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=filename; link.click(); URL.revokeObjectURL(url); }
