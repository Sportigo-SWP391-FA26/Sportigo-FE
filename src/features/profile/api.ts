import { apiClient } from '../../api/client';
import type { ChangePasswordInput, ChangePasswordResponse, MyProfile, UpdateProfileInput } from './types';

// FR-05
export async function getMyProfile() {
  const { data } = await apiClient.get<MyProfile>('/users/me');
  return data;
}

export async function updateMyProfile(input: UpdateProfileInput) {
  const { data } = await apiClient.patch<MyProfile>('/users/me', input);
  return data;
}

// FR-62
export async function changePassword(input: ChangePasswordInput) {
  // note: apiClient đã bật withCredentials nên trình duyệt nhận cookie refresh mới mà server set trong response
  const { data } = await apiClient.put<ChangePasswordResponse>('/users/me/password', input);
  // note: server đã thu hồi mọi phiên cũ → phải thay access token ngay, lưu cùng chỗ với login() (features/auth/api.ts)
  localStorage.setItem('accessToken', data.accessToken);
  return data;
}
