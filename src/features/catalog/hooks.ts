import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../training/errors';
import { createAssessmentMetric, createRoom, createSport, getAssessmentMetrics, getRooms, getSports, updateAssessmentMetric, updateRoom, updateSport } from './api';
import type { AssessmentMetricInput, RoomInput, SportInput } from './types';

export const catalogKeys = {
  sports: ['catalog', 'sports'] as const,
  rooms: ['catalog', 'rooms'] as const,
  metrics: (sportId: number) => ['catalog', 'sports', sportId, 'assessment-metrics'] as const,
};

export function useSports() {
  return useQuery({ queryKey: catalogKeys.sports, queryFn: getSports, retry: retryServerErrors });
}

export function useAssessmentMetrics(sportId?: number) {
  return useQuery({ queryKey: catalogKeys.metrics(sportId ?? 0), queryFn: () => getAssessmentMetrics(sportId!), enabled: Boolean(sportId), retry: retryServerErrors });
}
export function useCreateAssessmentMetric(sportId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: AssessmentMetricInput) => createAssessmentMetric(sportId, input), onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.metrics(sportId) }) });
}
export function useUpdateAssessmentMetric(sportId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: Partial<AssessmentMetricInput> }) => updateAssessmentMetric(sportId, id, input), onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.metrics(sportId) }) });
}

export function useRooms() {
  return useQuery({ queryKey: catalogKeys.rooms, queryFn: getRooms, retry: retryServerErrors });
}

export function useCreateSport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SportInput) => createSport(input),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.sports }),
  });
}

export function useUpdateSport(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SportInput>) => updateSport(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.sports }),
  });
}

export function useSetSportActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateSport(id, { isActive }),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.sports }),
  });
}

export function useCreateRoom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RoomInput) => createRoom(input),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.rooms }),
  });
}

export function useUpdateRoom(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<RoomInput>) => updateRoom(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.rooms }),
  });
}
