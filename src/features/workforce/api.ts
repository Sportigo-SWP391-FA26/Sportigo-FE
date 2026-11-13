import { apiClient } from '../../api/client';
import type {
  AdjustmentListItem,
  AdjustmentRequestInput,
  AdjustmentStatus,
  SessionCoachItem,
  SessionCoachQuery,
  ShiftInput,
  ShiftQuery,
  ShiftSummary,
  ShiftUpdateInput,
  StaffShift,
  SubstituteCandidate,
  SubstituteInput,
} from './types';

// FR-66: dạy thay / coach vắng (Manager)
export async function listSessionCoaches(query: SessionCoachQuery) {
  // note: chỉ gửi changedOnly khi bật vì backend .strict()
  const params = { from: query.from, to: query.to, ...(query.changedOnly ? { changedOnly: 'true' } : {}) };
  const { data } = await apiClient.get<{ items: SessionCoachItem[] }>('/session-coaches', { params });
  return data.items;
}

export async function listSubstituteCandidates(sessionId: number) {
  const { data } = await apiClient.get<{ items: SubstituteCandidate[] }>(`/session-coaches/${sessionId}/candidates`);
  return data.items;
}

export async function assignSubstitute(sessionId: number, input: SubstituteInput) {
  const { data } = await apiClient.put<SessionCoachItem>(`/session-coaches/${sessionId}/substitute`, input);
  return data;
}

export async function markCoachAbsent(sessionId: number, reason: string) {
  const { data } = await apiClient.post<SessionCoachItem>(`/session-coaches/${sessionId}/absence`, { reason });
  return data;
}

export async function resetSessionCoach(sessionId: number) {
  const { data } = await apiClient.delete<SessionCoachItem>(`/session-coaches/${sessionId}/substitute`);
  return data;
}

// FR-67: ca làm lễ tân
export async function listShifts(query: ShiftQuery) {
  const params = { from: query.from, to: query.to, ...(query.staffId ? { staffId: query.staffId } : {}) };
  const { data } = await apiClient.get<{ items: StaffShift[] }>('/staff-shifts', { params });
  return data.items;
}

export async function createShift(input: ShiftInput) {
  const { data } = await apiClient.post<StaffShift>('/staff-shifts', input);
  return data;
}

export async function updateShift(id: number, input: ShiftUpdateInput) {
  const { data } = await apiClient.patch<StaffShift>(`/staff-shifts/${id}`, input);
  return data;
}

export async function cancelShift(id: number, reason: string) {
  const { data } = await apiClient.post<StaffShift>(`/staff-shifts/${id}/cancel`, { reason });
  return data;
}

export async function listMyShifts(range: { from: string; to: string }) {
  const { data } = await apiClient.get<{ items: StaffShift[]; summary: ShiftSummary }>('/staff-shifts/me', { params: range });
  return data;
}

export async function clockIn(id: number) {
  const { data } = await apiClient.post<StaffShift>(`/staff-shifts/${id}/clock-in`);
  return data;
}

export async function clockOut(id: number) {
  const { data } = await apiClient.post<StaffShift>(`/staff-shifts/${id}/clock-out`);
  return data;
}

export async function requestAdjustment(id: number, input: AdjustmentRequestInput) {
  const { data } = await apiClient.post<StaffShift>(`/staff-shifts/${id}/adjustments`, input);
  return data;
}

export async function listAdjustments(status: AdjustmentStatus) {
  const { data } = await apiClient.get<{ items: AdjustmentListItem[] }>('/staff-shifts/adjustments', { params: { status } });
  return data.items;
}

export async function approveAdjustment(id: number, note?: string) {
  const { data } = await apiClient.post(`/staff-shifts/adjustments/${id}/approve`, note ? { note } : {});
  return data;
}

export async function rejectAdjustment(id: number, note: string) {
  const { data } = await apiClient.post(`/staff-shifts/adjustments/${id}/reject`, { note });
  return data;
}
