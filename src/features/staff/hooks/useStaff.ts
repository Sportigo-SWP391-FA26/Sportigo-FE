import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { userKeys } from '../../users/hooks/useUsers';
import { createStaff, getStaffPerformance, listStaff, updateStaff } from '../api';
import type { PerformanceRange } from '../performanceTypes';
import type { CreateStaffInput, StaffListQuery, UpdateStaffInput } from '../types';

export const staffKeys = {
  // note: nằm dưới key 'users' → khóa/mở khóa (useChangeUserStatus invalidate userKeys.all) cũng làm mới danh sách nhân sự
  all: [...userKeys.all, 'staff'] as const,
  list: (query: StaffListQuery) => [...staffKeys.all, 'list', query] as const,
};

export function useStaffList(query: StaffListQuery) {
  return useQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => listStaff(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}

// FR-65: giữ số liệu cũ trong lúc đổi khoảng ngày để bảng không nháy trắng
export function useStaffPerformance(range: PerformanceRange) {
  return useQuery({
    queryKey: [...staffKeys.all, 'performance', range] as const,
    queryFn: () => getStaffPerformance(range),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}

// note: invalidate cả userKeys.all để trang /app/users cũng thấy nhân sự mới
export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => createStaff(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStaffInput }) => updateStaff(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
