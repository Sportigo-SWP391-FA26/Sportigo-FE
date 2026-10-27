import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../training/errors';
import { cancelClassRegistration, getPublicClass, getPublicClasses, joinClassWaitlist, registerForClass, registerMemberOnBehalf } from './bookingApi';
import type { PublicClassFilters } from './bookingTypes';

export const bookingKeys = {
  all: ['class-bookings'] as const,
  list: (filters: PublicClassFilters) => [...bookingKeys.all, 'list', filters] as const,
  detail: (classId: number) => [...bookingKeys.all, 'detail', classId] as const,
};

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

export function useCancelClassRegistration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: number) => cancelClassRegistration(registrationId),
    onSuccess: async () => client.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}
