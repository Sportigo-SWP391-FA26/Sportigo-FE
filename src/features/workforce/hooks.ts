import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../training/errors';
import * as api from './api';
import type { AdjustmentRequestInput, AdjustmentStatus, SessionCoachQuery, ShiftInput, ShiftQuery, ShiftUpdateInput, SubstituteInput } from './types';

// FR-66/67: query key chung → mọi thao tác ghi chỉ cần invalidate một nhánh
export const workforceKeys = {
  all: ['workforce'] as const,
  sessions: (query: SessionCoachQuery) => [...workforceKeys.all, 'sessions', query] as const,
  candidates: (sessionId: number) => [...workforceKeys.all, 'candidates', sessionId] as const,
  shifts: (query: ShiftQuery) => [...workforceKeys.all, 'shifts', query] as const,
  myShifts: (range: { from: string; to: string }) => [...workforceKeys.all, 'my-shifts', range] as const,
  adjustments: (status: AdjustmentStatus) => [...workforceKeys.all, 'adjustments', status] as const,
};

function useInvalidateWorkforce() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: workforceKeys.all });
}

// ===== FR-66 =====
export function useSessionCoaches(query: SessionCoachQuery) {
  return useQuery({ queryKey: workforceKeys.sessions(query), queryFn: () => api.listSessionCoaches(query), placeholderData: keepPreviousData, retry: retryServerErrors });
}

export function useSubstituteCandidates(sessionId: number | null) {
  return useQuery({
    queryKey: workforceKeys.candidates(sessionId ?? 0),
    queryFn: () => api.listSubstituteCandidates(sessionId!),
    // note: chỉ tải khi mở hộp thoại cho một buổi cụ thể
    enabled: sessionId !== null,
    retry: retryServerErrors,
  });
}

export function useAssignSubstitute() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: ({ sessionId, input }: { sessionId: number; input: SubstituteInput }) => api.assignSubstitute(sessionId, input), onSuccess: invalidate });
}

export function useMarkCoachAbsent() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: ({ sessionId, reason }: { sessionId: number; reason: string }) => api.markCoachAbsent(sessionId, reason), onSuccess: invalidate });
}

export function useResetSessionCoach() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: (sessionId: number) => api.resetSessionCoach(sessionId), onSuccess: invalidate });
}

// ===== FR-67 =====
export function useShifts(query: ShiftQuery) {
  return useQuery({ queryKey: workforceKeys.shifts(query), queryFn: () => api.listShifts(query), placeholderData: keepPreviousData, retry: retryServerErrors });
}

export function useCreateShift() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: (input: ShiftInput) => api.createShift(input), onSuccess: invalidate });
}

export function useUpdateShift() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: ShiftUpdateInput }) => api.updateShift(id, input), onSuccess: invalidate });
}

export function useCancelShift() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => api.cancelShift(id, reason), onSuccess: invalidate });
}

export function useMyShifts(range: { from: string; to: string }) {
  return useQuery({ queryKey: workforceKeys.myShifts(range), queryFn: () => api.listMyShifts(range), placeholderData: keepPreviousData, retry: retryServerErrors });
}

export function useClockIn() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: (id: number) => api.clockIn(id), onSuccess: invalidate });
}

export function useClockOut() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: (id: number) => api.clockOut(id), onSuccess: invalidate });
}

export function useRequestAdjustment() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: AdjustmentRequestInput }) => api.requestAdjustment(id, input), onSuccess: invalidate });
}

export function useAdjustments(status: AdjustmentStatus) {
  return useQuery({ queryKey: workforceKeys.adjustments(status), queryFn: () => api.listAdjustments(status), retry: retryServerErrors });
}

export function useReviewAdjustment() {
  const invalidate = useInvalidateWorkforce();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: number; approve: boolean; note?: string }) =>
      approve ? api.approveAdjustment(id, note) : api.rejectAdjustment(id, note ?? ''),
    onSuccess: invalidate,
  });
}
