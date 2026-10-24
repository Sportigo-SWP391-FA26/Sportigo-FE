import { apiClient } from '../../api/client';
import type { UserListPage, UserListQuery } from './types';

// Bỏ tham số rỗng để không gửi "?q=" hay "?role=" lên backend (backend dùng .strict())
function cleanParams<T extends object>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

// FR-09
export async function listUsers(query: UserListQuery) {
  const { data } = await apiClient.get<UserListPage>('/users', { params: cleanParams(query) });
  return data;
}
