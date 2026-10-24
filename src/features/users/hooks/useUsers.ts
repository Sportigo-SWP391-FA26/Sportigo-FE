import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { changeUserStatus, listUsers } from '../api';
import type { ChangeStatusInput, UserListQuery } from '../types';

export const userKeys = {
  all: ['users'] as const,
  list: (query: UserListQuery) => [...userKeys.all, 'list', query] as const,
};

// FR-09: giữ dữ liệu trang cũ khi đổi bộ lọc để bảng không bị nháy trắng
export function useUserList(query: UserListQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => listUsers(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}

// FR-06: đổi trạng thái xong thì làm mới mọi danh sách người dùng đang cache
export function useChangeUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: ChangeStatusInput }) => changeUserStatus(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
