import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { getStaffSupportRequest, listSupportQueue, sendStaffMessage, updateSupportRequest } from '../api';
import type { StaffSupportDetail, SupportQueueQuery, UpdateSupportInput } from '../types';
import { supportKeys } from './useSupport';

// FR-56: key riêng cho phía nhân viên vì response chi tiết có thêm history và tin nội bộ
export const staffSupportKeys = {
  all: [...supportKeys.all, 'staff'] as const,
  queue: (query: SupportQueueQuery) => [...staffSupportKeys.all, 'queue', query] as const,
  detail: (id: number) => [...staffSupportKeys.all, 'detail', id] as const,
};

export function useSupportQueue(query: SupportQueueQuery) {
  return useQuery({
    queryKey: staffSupportKeys.queue(query),
    queryFn: () => listSupportQueue(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
    // note: hàng đợi tự làm mới mỗi phút để thấy yêu cầu mới
    refetchInterval: 60_000,
  });
}

export function useStaffSupportDetail(id: number) {
  return useQuery({
    queryKey: staffSupportKeys.detail(id),
    queryFn: () => getStaffSupportRequest(id),
    retry: retryServerErrors,
    refetchInterval: 30_000,
  });
}

function useStaffMutation<TArgs>(mutationFn: (args: TArgs) => Promise<StaffSupportDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(staffSupportKeys.detail(detail.id), detail);
      return queryClient.invalidateQueries({ queryKey: [...staffSupportKeys.all, 'queue'] });
    },
  });
}

export const useUpdateSupportRequest = () =>
  useStaffMutation(({ id, input }: { id: number; input: UpdateSupportInput }) => updateSupportRequest(id, input));

export const useSendStaffMessage = () =>
  useStaffMutation(({ id, content, isInternal }: { id: number; content: string; isInternal: boolean }) => sendStaffMessage(id, content, isInternal));
