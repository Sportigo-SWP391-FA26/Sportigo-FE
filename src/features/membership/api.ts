import { isAxiosError } from 'axios';
import { apiClient } from '../../api/client';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type MembershipPlan = { id: number; name: string; durationMonths: number; price: string; description: string | null; status: PlanStatus };
export type ManagedPlan = MembershipPlan & { _count: { subscriptions: number } };
export type PlanInput = { name: string; durationMonths: number; price: number; description: string | null; status: PlanStatus };

export type Subscription = { id: number; status: string; price: string; startDate: string | null; endDate: string | null; plan: MembershipPlan };
export type MyMembership = {
  current: Subscription | null;
  upcoming: Subscription[];
  validUntil: string | null;
  pendingOrder: { id: number; orderNumber: string; expiresAt: string | null; plan: MembershipPlan } | null;
  history: Subscription[];
};
export type PurchaseResult = { orderId: number; orderNumber: string; amount: string; expiresAt: string; subscriptionId: number };

export type MemberIdentity = { id: number; memberCode: string; displayName: string; avatarUrl: string | null };
export type CheckIn = { id: number; method: 'QR' | 'MANUAL'; checkedInAt: string; checkedInBy: string; member: MemberIdentity; planName: string; endDate: string | null };
export type CheckInResult = CheckIn & { alreadyCheckedIn: boolean; daysRemaining: number };
export type CheckInFailure = { code: string; message: string; member?: MemberIdentity };

export const membershipApi = {
  plans: () => apiClient.get<MembershipPlan[]>('/memberships/plans').then((r) => r.data),
  managedPlans: () => apiClient.get<ManagedPlan[]>('/memberships/plans/manage').then((r) => r.data),
  createPlan: (data: PlanInput) => apiClient.post('/memberships/plans/manage', data).then((r) => r.data),
  updatePlan: (id: number, data: Partial<PlanInput>) => apiClient.patch(`/memberships/plans/manage/${id}`, data).then((r) => r.data),
  deletePlan: (id: number) => apiClient.delete(`/memberships/plans/manage/${id}`).then((r) => r.data),
  mine: () => apiClient.get<MyMembership>('/members/me/membership').then((r) => r.data),
  purchase: (planId: number) => apiClient.post<PurchaseResult>('/memberships/purchase', { planId }).then((r) => r.data),
  sellToMember: (memberId: number, planId: number) => apiClient.post<PurchaseResult>(`/members/${memberId}/memberships`, { planId }).then((r) => r.data),
  checkIn: (memberCode: string, method: 'QR' | 'MANUAL') => apiClient.post<CheckInResult>('/check-ins', { memberCode, method }).then((r) => r.data),
  recentCheckIns: () => apiClient.get<{ items: CheckIn[] }>('/check-ins', { params: { limit: 10 } }).then((r) => r.data.items),
};

export function toCheckInFailure(error: unknown): CheckInFailure {
  if (isAxiosError(error) && error.response?.data?.code) {
    const { code, message, details } = error.response.data as { code: string; message: string; details?: { member?: MemberIdentity } };
    return { code, message, member: details?.member };
  }
  return { code: 'UNKNOWN', message: 'Không thể check-in lúc này. Vui lòng thử lại.' };
}

export const money = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
export const formatDay = (value: string | null) => (value ? value.split('-').reverse().join('/') : '—');
