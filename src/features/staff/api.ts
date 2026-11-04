import { apiClient } from '../../api/client';
import type { CreateStaffInput, StaffListPage, StaffListQuery, StaffMember, UpdateStaffInput } from './types';

// FR-07
export async function listStaff(query: StaffListQuery) {
  // note: bỏ tham số rỗng vì backend dùng .strict() và không nhận "?q="
  const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''));
  const { data } = await apiClient.get<StaffListPage>('/staff', { params });
  return data;
}

export async function createStaff(input: CreateStaffInput) {
  const { data } = await apiClient.post<StaffMember & { emailSent: boolean }>('/staff', input);
  return data;
}

export async function updateStaff(id: number, input: UpdateStaffInput) {
  const { data } = await apiClient.patch<StaffMember>(`/staff/${id}`, input);
  return data;
}
