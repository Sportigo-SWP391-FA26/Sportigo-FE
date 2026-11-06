import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { changePrivateOccurrence, completePrivateSession, getMyPrivateEnrollments, getPrivateCourse, getPrivateCourses, updatePrivateCourse } from '../api';
import type { OccurrenceActionInput, UpdatePrivateCourseInput } from '../types';

export const privateCourseKeys = {
  all: ['private-courses'] as const,
  list: () => [...privateCourseKeys.all, 'list'] as const,
  detail: (id: number) => [...privateCourseKeys.all, 'detail', id] as const,
  enrollments: () => [...privateCourseKeys.all, 'enrollments'] as const,
};

export function usePrivateCourses(enabled = true) {
  return useQuery({
    queryKey: privateCourseKeys.list(),
    queryFn: getPrivateCourses,
    retry: retryServerErrors,
    enabled,
  });
}

export function usePrivateCourse(courseId: number) {
  return useQuery({
    queryKey: privateCourseKeys.detail(courseId),
    queryFn: () => getPrivateCourse(courseId),
    retry: retryServerErrors,
    enabled: Number.isInteger(courseId) && courseId > 0,
  });
}

export function useUpdatePrivateCourse(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePrivateCourseInput) => updatePrivateCourse(courseId, input),
    onSuccess: (course) => {
      queryClient.setQueryData(privateCourseKeys.detail(courseId), course);
      queryClient.invalidateQueries({ queryKey: privateCourseKeys.list() });
    },
  });
}

export function useMyPrivateEnrollments() {
  return useQuery({
    queryKey: privateCourseKeys.enrollments(),
    queryFn: getMyPrivateEnrollments,
    retry: retryServerErrors,
  });
}

export function useChangePrivateOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      enrollmentId,
      scheduleId,
      sessionDate,
      input,
    }: {
      enrollmentId: number;
      scheduleId: number;
      sessionDate: string;
      input: OccurrenceActionInput;
    }) => changePrivateOccurrence(enrollmentId, scheduleId, sessionDate, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: privateCourseKeys.enrollments() }),
  });
}

export function useCompletePrivateSession() {
  return useMutation({
    mutationFn: ({ enrollmentId, scheduleId, sessionDate }: { enrollmentId: number; scheduleId: number; sessionDate: string }) =>
      completePrivateSession(enrollmentId, scheduleId, sessionDate),
  });
}
