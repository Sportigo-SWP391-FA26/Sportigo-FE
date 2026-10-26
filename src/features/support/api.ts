import { apiClient } from '../../api/client';
import type {
  CreateSupportInput,
  StaffSupportDetail,
  SupportListPage,
  SupportListQuery,
  SupportQueueQuery,
  SupportRequestDetail,
  UpdateSupportInput,
} from './types';

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

// FR-56: cùng endpoint, backend trả dữ liệu theo role nhân viên
export async function listSupportQueue(query: SupportQueueQuery) {
  const params = Object.fromEntries(
    Object.entries({ ...query, mine: query.mine ? 'true' : undefined }).filter(([, value]) => value !== undefined && value !== ''),
  );
  const { data } = await apiClient.get<SupportListPage>('/support-requests', { params });
  return data;
}

export async function getStaffSupportRequest(id: number) {
  const { data } = await apiClient.get<StaffSupportDetail>(`/support-requests/${id}`);
  return data;
}

export async function updateSupportRequest(id: number, input: UpdateSupportInput) {
  const { data } = await apiClient.patch<StaffSupportDetail>(`/support-requests/${id}`, input);
  return data;
}

export async function sendStaffMessage(id: number, content: string, isInternal: boolean) {
  const { data } = await apiClient.post<StaffSupportDetail>(`/support-requests/${id}/messages`, { content, isInternal });
  return data;
}
