import { apiClient } from '../../api/client';
import type { CreateSupportInput, SupportListPage, SupportListQuery, SupportRequestDetail } from './types';

// FR-55
export async function listSupportRequests(query: SupportListQuery) {
  const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
  const { data } = await apiClient.get<SupportListPage>('/support-requests', { params });
  return data;
}

export async function getSupportRequest(id: number) {
  const { data } = await apiClient.get<SupportRequestDetail>(`/support-requests/${id}`);
  return data;
}

export async function createSupportRequest(input: CreateSupportInput) {
  const { data } = await apiClient.post<SupportRequestDetail>('/support-requests', input);
  return data;
}

export async function sendSupportMessage(id: number, content: string) {
  const { data } = await apiClient.post<SupportRequestDetail>(`/support-requests/${id}/messages`, { content });
  return data;
}

export async function cancelSupportRequest(id: number) {
  const { data } = await apiClient.post<SupportRequestDetail>(`/support-requests/${id}/cancel`);
  return data;
}
