import { useQuery } from '@tanstack/react-query';
import { getCoachMembers, getCoachSessions, getCoachTrainees, getMemberContexts, getSports } from '../api';
import { retryServerErrors } from '../errors';
import { trainingKeys } from '../queryKeys';

// API Training lấy từ module khác của nhóm: môn (FR-12), khóa 1-1, lớp và buổi học (FR-11, FR-17).
// API chưa có trả 404 "route missing" và giao diện hiển thị "chưa sẵn sàng";
// backend bổ sung đúng hợp đồng thì màn hình tự hoạt động, không cần sửa FE.

export function useSports() {
  return useQuery({
    queryKey: trainingKeys.sports(),
    queryFn: getSports,
    retry: retryServerErrors,
    staleTime: 5 * 60_000,
  });
}

export function useCoachSessions(range: { from: string; to: string }) {
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

// FR-52 · Học viên cho ô chọn của form đánh giá (lớp nhóm + khóa 1-1)
export function useCoachMembers() {
  return useQuery({
    queryKey: trainingKeys.coachMembers(),
    queryFn: getCoachMembers,
    retry: retryServerErrors,
  });
}

// FR-52 · Ngữ cảnh đánh giá của học viên đang chọn; chỉ gọi khi đã chọn học viên
export function useMemberContexts(memberId: number | undefined) {
  return useQuery({
    queryKey: trainingKeys.memberContexts(memberId ?? 0),
    queryFn: () => getMemberContexts(memberId as number),
    enabled: Boolean(memberId),
    retry: retryServerErrors,
  });
}
