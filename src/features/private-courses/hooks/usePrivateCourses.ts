import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { changePrivateOccurrence, getMyPrivateEnrollments, getPrivateCourse, getPrivateCourses } from '../api';
import type { OccurrenceActionInput } from '../types';

export const privateCourseKeys = {
  all: ['private-courses'] as const,
  list: () => [...privateCourseKeys.all, 'list'] as const,
  detail: (id: number) => [...privateCourseKeys.all, 'detail', id] as const,
  enrollments: () => [...privateCourseKeys.all, 'enrollments'] as const,
};

export function usePrivateCourses() {
  return useQuery({
    queryKey: privateCourseKeys.list(),
    queryFn: getPrivateCourses,
    retry: retryServerErrors,
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
