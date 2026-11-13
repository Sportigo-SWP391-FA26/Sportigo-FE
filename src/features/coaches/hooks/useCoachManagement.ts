import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import {
  assignCoachSport,
  createCoachAvailability,
  deleteCoachAvailability,
  getCoachAvailability,
  getCoachSchedule,
  getCoachSports,
  getCoaches,
  getQualifiedCoaches,
  removeCoachSport,
  updateCoachAvailability,
  getMyAvailabilityCalendar,
  saveMyAvailabilityDraft,
  submitMyAvailability,
  createAvailabilityChangeRequest,
  getMyAvailabilityChangeRequests,
  getAvailabilitySubmissions,
  reviewAvailabilitySubmission,
  getAvailabilityChangeRequests,
  reviewAvailabilityChangeRequest,
} from '../api';
import type { AvailabilityInput } from '../types';

export const coachKeys = {
  all: ['coaches'] as const,
  sports: (coachId: number) => [...coachKeys.all, coachId, 'sports'] as const,
  availability: (coachId: number) => [...coachKeys.all, coachId, 'availability'] as const,
  schedule: (coachId: number, from: string, to: string) => [...coachKeys.all, coachId, 'schedule', from, to] as const,
  list: () => [...coachKeys.all, 'list'] as const,
  qualified: (sportId?: number) => [...coachKeys.all, 'qualified', sportId ?? 'none'] as const,
  myCalendar: (month: string) => [...coachKeys.all, 'me', 'availability-calendar', month] as const,
  myChanges: () => [...coachKeys.all, 'me', 'availability-changes'] as const,
  submissions: (month?: string, status?: string) => [...coachKeys.all, 'availability-submissions', month, status] as const,
  changes: (status?: string) => [...coachKeys.all, 'availability-change-requests', status] as const,
};

export function useCoachSports(coachId: number) {
  return useQuery({
    queryKey: coachKeys.sports(coachId),
    queryFn: () => getCoachSports(coachId),
    retry: retryServerErrors,
    enabled: Number.isInteger(coachId) && coachId > 0,
  });
}

export function useCoachAvailability(coachId: number) {
  return useQuery({
    queryKey: coachKeys.availability(coachId),
    queryFn: () => getCoachAvailability(coachId),
    retry: retryServerErrors,
    enabled: Number.isInteger(coachId) && coachId > 0,
  });
}

export function useCoachSchedule(coachId: number, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: coachKeys.schedule(coachId, from, to),
    queryFn: () => getCoachSchedule(coachId, from, to),
    retry: retryServerErrors,
    enabled: enabled && Number.isInteger(coachId) && coachId > 0,
  });
}

export function useCoaches() {
  return useQuery({
    queryKey: coachKeys.list(),
    queryFn: getCoaches,
    retry: retryServerErrors,
  });
}

export function useQualifiedCoaches(sportId?: number) {
  return useQuery({
    queryKey: coachKeys.qualified(sportId),
    queryFn: () => getQualifiedCoaches(sportId),
    retry: retryServerErrors,
    enabled: Number.isInteger(sportId) && Number(sportId) > 0,
  });
}

export function useAssignCoachSport(coachId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sportId: number) => assignCoachSport(coachId, sportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.sports(coachId) }),
  });
}

export function useRemoveCoachSport(coachId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sportId: number) => removeCoachSport(coachId, sportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.sports(coachId) }),
  });
}

export function useSaveAvailability(coachId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ availabilityId, input }: { availabilityId?: number; input: AvailabilityInput }) =>
      availabilityId === undefined
        ? createCoachAvailability(coachId, input)
        : updateCoachAvailability(coachId, availabilityId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.availability(coachId) }),
  });
}

export function useDeleteAvailability(coachId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (availabilityId: number) => deleteCoachAvailability(coachId, availabilityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.availability(coachId) }),
  });
}

export function useMyAvailabilityCalendar(month: string) {
  return useQuery({ queryKey: coachKeys.myCalendar(month), queryFn: () => getMyAvailabilityCalendar(month), retry: retryServerErrors });
}

export function useSaveMyAvailabilityDraft(month: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (selections: Array<{ dayOfWeek: number; shiftCode: string }>) => saveMyAvailabilityDraft(month, selections), onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.myCalendar(month) }) });
}

export function useSubmitMyAvailability(month: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: () => submitMyAvailability(month), onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.myCalendar(month) }) });
}

export function useCreateAvailabilityChangeRequest(month: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { month: string; oldDayOfWeek: number; oldShiftCode: string; newDayOfWeek: number; newShiftCode: string; reason: string }) => createAvailabilityChangeRequest(input), onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: coachKeys.myCalendar(month) }), queryClient.invalidateQueries({ queryKey: coachKeys.myChanges() })]) });
}

export function useMyAvailabilityChangeRequests() {
  return useQuery({ queryKey: coachKeys.myChanges(), queryFn: getMyAvailabilityChangeRequests, retry: retryServerErrors });
}

export function useAvailabilitySubmissions(month?: string, status?: string) {
  return useQuery({ queryKey: coachKeys.submissions(month, status), queryFn: () => getAvailabilitySubmissions({ month, status }), retry: retryServerErrors });
}

export function useReviewAvailabilitySubmission(month?: string, status?: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: { decision: 'APPROVE' | 'REJECT'; reason?: string } }) => reviewAvailabilitySubmission(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.submissions(month, status) }) });
}

export function useAvailabilityChangeRequests(status?: string) {
  return useQuery({ queryKey: coachKeys.changes(status), queryFn: () => getAvailabilityChangeRequests({ status }), retry: retryServerErrors });
}

export function useReviewAvailabilityChangeRequest(status?: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: { decision: 'APPROVE' | 'REJECT'; reason?: string } }) => reviewAvailabilityChangeRequest(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.changes(status) }) });
}
