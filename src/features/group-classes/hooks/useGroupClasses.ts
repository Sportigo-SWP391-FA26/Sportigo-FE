import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import {
  cancelClassSession,
  changeClassSession,
  createClassSession,
  createGroupClass,
  createRecurringClassSessions,
  getGroupClassSessions,
  getGroupClasses,
  updateGroupClass,
  updateGroupClassStatus,
} from '../api';
import type {
  ChangeSessionInput,
  CreateGroupClassInput,
  CreateRecurringSessionsInput,
  CreateSessionInput,
  GroupClassStatus,
  UpdateGroupClassInput,
} from '../types';

export const groupClassKeys = {
  all: ['group-classes'] as const,
  list: () => [...groupClassKeys.all, 'list'] as const,
  sessions: (classId: number) => [...groupClassKeys.all, classId, 'sessions'] as const,
};

export function useGroupClasses() {
  return useQuery({
    queryKey: groupClassKeys.list(),
    queryFn: getGroupClasses,
    retry: retryServerErrors,
  });
}

export function useGroupClassSessions(classId: number) {
  return useQuery({
    queryKey: groupClassKeys.sessions(classId),
    queryFn: () => getGroupClassSessions(classId),
    retry: retryServerErrors,
    enabled: Number.isInteger(classId) && classId > 0,
  });
}

export function useUpdateGroupClass(classId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupClassInput) => updateGroupClass(classId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupClassKeys.all }),
  });
}

export function useCreateGroupClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupClassInput) => createGroupClass(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupClassKeys.all }),
  });
}

export function useUpdateGroupClassStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, status }: { classId: number; status: GroupClassStatus }) =>
      updateGroupClassStatus(classId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupClassKeys.all }),
  });
}

export function useCreateClassSession(classId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSessionInput) => createClassSession(classId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupClassKeys.sessions(classId) }),
  });
}

export function useCreateRecurringClassSessions(classId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringSessionsInput) => createRecurringClassSessions(classId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupClassKeys.sessions(classId) }),
  });
}

export function useChangeClassSession(classId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: number; input: ChangeSessionInput }) =>
      changeClassSession(sessionId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupClassKeys.sessions(classId) }),
        queryClient.invalidateQueries({ queryKey: trainingKeys.attendance() }),
        queryClient.invalidateQueries({ queryKey: [...trainingKeys.all, 'coach-sessions'] }),
      ]),
  });
}

export function useCancelClassSession(classId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: number; reason: string }) =>
      cancelClassSession(sessionId, reason),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupClassKeys.sessions(classId) }),
        queryClient.invalidateQueries({ queryKey: trainingKeys.attendance() }),
        queryClient.invalidateQueries({ queryKey: [...trainingKeys.all, 'coach-sessions'] }),
      ]),
  });
}
