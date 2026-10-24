import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { listUsers } from '../api';
import type { UserListQuery } from '../types';

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
