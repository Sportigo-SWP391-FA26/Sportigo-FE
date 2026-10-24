import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { cancelSupportRequest, createSupportRequest, getSupportRequest, listSupportRequests, sendSupportMessage } from '../api';
import type { CreateSupportInput, SupportListQuery, SupportRequestDetail } from '../types';

export const supportKeys = {
  all: ['support-requests'] as const,
  list: (query: SupportListQuery) => [...supportKeys.all, 'list', query] as const,
  detail: (id: number) => [...supportKeys.all, 'detail', id] as const,
};

export function useSupportList(query: SupportListQuery) {
  return useQuery({
    queryKey: supportKeys.list(query),
    queryFn: () => listSupportRequests(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}

export function useSupportDetail(id: number) {
  return useQuery({
    queryKey: supportKeys.detail(id),
    queryFn: () => getSupportRequest(id),
    retry: retryServerErrors,
    // note: tự hỏi lại mỗi 30 giây để thấy phản hồi mới của nhân viên khi đang mở trang
    refetchInterval: 30_000,
  });
}

// note: mọi API thay đổi đều trả chi tiết mới → ghi thẳng vào cache chi tiết và làm mới danh sách
function useDetailMutation<TArgs>(mutationFn: (args: TArgs) => Promise<SupportRequestDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(supportKeys.detail(detail.id), detail);
      return queryClient.invalidateQueries({ queryKey: [...supportKeys.all, 'list'] });
    },
  });
}

export const useCreateSupportRequest = () => useDetailMutation((input: CreateSupportInput) => createSupportRequest(input));
export const useSendSupportMessage = () =>
  useDetailMutation(({ id, content }: { id: number; content: string }) => sendSupportMessage(id, content));
export const useCancelSupportRequest = () => useDetailMutation((id: number) => cancelSupportRequest(id));
