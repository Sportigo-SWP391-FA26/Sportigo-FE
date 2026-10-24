import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { changePassword, getMyProfile, updateMyProfile } from '../api';
import type { ChangePasswordInput, UpdateProfileInput } from '../types';

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

// FR-62: không cần invalidate cache vì đổi mật khẩu không làm đổi dữ liệu hồ sơ
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}
