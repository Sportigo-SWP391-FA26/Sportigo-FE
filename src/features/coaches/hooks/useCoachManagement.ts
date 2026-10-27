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
  removeCoachSport,
  updateCoachAvailability,
} from '../api';
import type { AvailabilityInput } from '../types';

export const coachKeys = {
  all: ['coaches'] as const,
  sports: (coachId: number) => [...coachKeys.all, coachId, 'sports'] as const,
  availability: (coachId: number) => [...coachKeys.all, coachId, 'availability'] as const,
  schedule: (coachId: number, from: string, to: string) => [...coachKeys.all, coachId, 'schedule', from, to] as const,
  list: () => [...coachKeys.all, 'list'] as const,
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
