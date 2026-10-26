import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAttendanceHistory, getSessionAttendance, markSessionAttendance } from '../api';
import { retryServerErrors } from '../errors';
import { endOfCenterDay, startOfCenterDay } from '../format';
import { trainingKeys } from '../queryKeys';
import type { AttendanceQuery, AttendanceStatus, MarkAttendanceInput } from '../types';

export function useAttendanceHistory(query: AttendanceQuery, enabled = true) {
  return useQuery({
    queryKey: trainingKeys.attendanceHistory(query),
    queryFn: () => getAttendanceHistory(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
    enabled,
  });
}

export function useSessionRoster(sessionId: number) {
  return useQuery({
    queryKey: trainingKeys.sessionRoster(sessionId),
    queryFn: () => getSessionAttendance(sessionId),
    retry: retryServerErrors,
    enabled: Number.isInteger(sessionId) && sessionId > 0,
  });
}

export function useMarkAttendance(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => markSessionAttendance(sessionId, input),
    // Cả danh sách buổi và lịch sử điểm danh đều thay đổi
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trainingKeys.attendance() }),
  });
}

const SUMMARY_STATUSES: (AttendanceStatus | undefined)[] = ['PRESENT', 'LATE', undefined];

/**
 * Đếm số buổi theo trạng thái trong khoảng ngày (giờ trung tâm) bằng trường `total`
 * của GET /attendance, không tải toàn bộ danh sách.
 */
export function useAttendanceSummary(range: { from: string; to: string }) {
  const results = useQueries({
    queries: SUMMARY_STATUSES.map((status) => {
      const query: AttendanceQuery = {
        status,
        from: startOfCenterDay(range.from),
        to: endOfCenterDay(range.to),
        page: 1,
        pageSize: 1,
      };
      return {
        queryKey: trainingKeys.attendanceHistory(query),
        queryFn: () => getAttendanceHistory(query),
        retry: retryServerErrors,
      };
    }),
  });

  const [present, late, marked] = results.map((result) => result.data?.total);
  return {
    isPending: results.some((result) => result.isPending),
    error: results.find((result) => result.error)?.error ?? null,
    refetch: () => results.forEach((result) => result.refetch()),
    data:
      present === undefined || late === undefined || marked === undefined
        ? undefined
        : { attended: present + late, marked },
  };
}
