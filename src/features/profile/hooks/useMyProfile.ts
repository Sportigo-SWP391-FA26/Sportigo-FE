import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import {
  changePassword,
  confirmEmailChange,
  getMyProfile,
  requestEmailChange,
  updateMyProfile,
} from '../api';
import type {
  ChangePasswordInput,
  EmailChangeInput,
  UpdateProfileInput,
} from '../types';

export const profileKeys = {
  me: () => ['profile', 'me'] as const,
};

// FR-05: hồ sơ của người đang đăng nhập; navbar và trang Hồ sơ dùng chung một cache
export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: getMyProfile,
    retry: retryServerErrors,
    enabled,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
    onSuccess: (profile) => {
      // note: ghi ngay response vào cache để navbar đổi tên tức thì, rồi invalidate để đồng bộ lại với server
      queryClient.setQueryData(profileKeys.me(), profile);
      return queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
}

// FR-05 đổi email bước 1: chưa đổi dữ liệu hồ sơ nên không đụng cache
export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (input: EmailChangeInput) => requestEmailChange(input),
  });
}

// FR-05 đổi email bước 2: ghi hồ sơ mới vào cache để trang Hồ sơ và navbar hiện email mới ngay
export function useConfirmEmailChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => confirmEmailChange(code),
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me(), profile),
  });
}

// FR-62: không cần invalidate cache vì đổi mật khẩu không làm đổi dữ liệu hồ sơ
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}
