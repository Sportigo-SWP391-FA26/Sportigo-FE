import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../training/errors';
import { cancelClassRegistration, getMyClassRegistrations, getMyWaitlists, getPublicClass, getPublicClasses, getWaitlistHistory, getWaitlists, joinClassWaitlist, registerForClass, registerMemberOnBehalf, respondToClassWaitlist } from './bookingApi';
import type { PublicClassFilters } from './bookingTypes';

export const bookingKeys = {
  all: ['class-bookings'] as const,
  list: (filters: PublicClassFilters) => [...bookingKeys.all, 'list', filters] as const,
  detail: (classId: number) => [...bookingKeys.all, 'detail', classId] as const,
  mine: () => [...bookingKeys.all, 'mine'] as const,
  waitlists: () => [...bookingKeys.all, 'waitlists'] as const,
  managerWaitlists: (filters: object) => [...bookingKeys.all, 'manager-waitlists', filters] as const,
  waitlistHistory: (waitlistId: number) => [...bookingKeys.all, 'waitlist-history', waitlistId] as const,
};

export function useMyClassRegistrations() {
  return useQuery({
    queryKey: bookingKeys.mine(),
    queryFn: getMyClassRegistrations,
    retry: retryServerErrors,
  });
}

export function usePublicClasses(filters: PublicClassFilters) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => getPublicClasses(filters),
    retry: retryServerErrors,
  });
}

export function usePublicClass(classId: number) {
  return useQuery({
    queryKey: bookingKeys.detail(classId),
    queryFn: () => getPublicClass(classId),
    retry: retryServerErrors,
    enabled: Number.isInteger(classId) && classId > 0,
  });
}

export function useRegisterForClass(classId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => registerForClass(classId),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useRegisterMemberOnBehalf(classId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => registerMemberOnBehalf(classId, memberId),
    onSettled: async () => client.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}

export function useJoinClassWaitlist(classId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => joinClassWaitlist(classId),
    onSuccess: async () => client.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}

export function useMyWaitlists(enabled = true) {
  return useQuery({
    queryKey: bookingKeys.waitlists(),
    queryFn: getMyWaitlists,
    retry: retryServerErrors,
    enabled,
  });
}

export function useManagerWaitlists(filters: Parameters<typeof getWaitlists>[0], enabled = true) {
  return useQuery({
    queryKey: bookingKeys.managerWaitlists(filters),
    queryFn: () => getWaitlists(filters),
    retry: retryServerErrors,
    enabled,
  });
}

export function useWaitlistHistory(waitlistId: number | null) {
  return useQuery({
    queryKey: bookingKeys.waitlistHistory(waitlistId ?? 0),
    queryFn: () => getWaitlistHistory(waitlistId!),
    retry: retryServerErrors,
    enabled: Number.isInteger(waitlistId) && Number(waitlistId) > 0,
  });
}

export function useRespondToClassWaitlist() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, accept }: { classId: number; accept: boolean }) =>
      respondToClassWaitlist(classId, accept),
    onSuccess: async () => client.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}

export function useCancelClassRegistration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: number) => cancelClassRegistration(registrationId),
    onSuccess: async () => client.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}
