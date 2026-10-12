import { useQuery } from '@tanstack/react-query';
import { getCoachSessions, getCoachTrainees, getSports } from '../api';
import { retryServerErrors } from '../errors';
import { trainingKeys } from '../queryKeys';

// Các API dưới đây backend chưa có (BE-1 → BE-3 trong docs/training-ui.md).
// Khi gọi sẽ nhận 404 "route missing" và giao diện hiển thị "chưa sẵn sàng";
// backend bổ sung đúng hợp đồng thì màn hình tự hoạt động, không cần sửa FE.

export function useSports() {
  return useQuery({
    queryKey: trainingKeys.sports(),
    queryFn: getSports,
    retry: retryServerErrors,
    staleTime: 5 * 60_000,
  });
}

export function useCoachSessions(range: { from?: string; to?: string }) {
  return useQuery({
    queryKey: trainingKeys.coachSessions(range),
    queryFn: () => getCoachSessions(range),
    retry: retryServerErrors,
  });
}

export function useCoachTrainees() {
  return useQuery({
    queryKey: trainingKeys.coachTrainees(),
    queryFn: getCoachTrainees,
    retry: retryServerErrors,
  });
}
