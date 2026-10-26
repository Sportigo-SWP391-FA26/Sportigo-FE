import { apiClient } from '../../api/client';
import type {
  ChangePasswordInput,
  ChangePasswordResponse,
  EmailChangeInput,
  EmailChangeResponse,
  MyProfile,
  UpdateProfileInput,
} from './types';

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
  const { data } = await apiClient.put<ChangePasswordResponse>(
    '/users/me/password',
    input,
  );
  // note: server đã thu hồi mọi phiên cũ → phải thay access token ngay, lưu cùng chỗ với login() (features/auth/api.ts)
  localStorage.setItem('accessToken', data.accessToken);
  return data;
}

// FR-05 đổi email bước 1: server gửi OTP tới email mới, email hiện tại chưa đổi
export async function requestEmailChange(input: EmailChangeInput) {
  const { data } = await apiClient.post<EmailChangeResponse>(
    '/users/me/email-change',
    input,
  );
  return data;
}

// FR-05 đổi email bước 2: đúng OTP thì server trả hồ sơ với email mới
export async function confirmEmailChange(code: string) {
  const { data } = await apiClient.post<MyProfile>(
    '/users/me/email-change/confirm',
    { code },
  );
  return data;
}
