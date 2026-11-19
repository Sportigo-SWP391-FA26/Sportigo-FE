import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { assignPrivateCourseCoach, changePrivateOccurrence, completePrivateSession, createPrivateCourse, deletePrivateCourse, getMyPrivateEnrollments, getPrivateCourse, getPrivateCourses, unassignPrivateCourseCoach, updatePrivateCourse } from '../api';
import type { CreatePrivateCourseInput, OccurrenceActionInput, UpdatePrivateCourseInput } from '../types';

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

export function useCreatePrivateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePrivateCourseInput) => createPrivateCourse(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: privateCourseKeys.list() }),
  });
}

export function useUpdatePrivateCourse(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePrivateCourseInput) => updatePrivateCourse(courseId, input),
    onSuccess: () => {
      // PATCH chỉ trả các cột của PrivateCourse, không có sport/coaches/availabilities.
      // Luôn nạp lại chi tiết đầy đủ trước khi render trang.
      queryClient.invalidateQueries({ queryKey: privateCourseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: privateCourseKeys.list() });
    },
  });
}

export function useDeletePrivateCourse() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deletePrivateCourse, onSuccess: () => queryClient.invalidateQueries({ queryKey: privateCourseKeys.all }) });
}

export function usePrivateCourseCoachAssignment(courseId: number) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: privateCourseKeys.all });
  const assign = useMutation({ mutationFn: (coachId: number) => assignPrivateCourseCoach(courseId, coachId), onSuccess: refresh });
  const unassign = useMutation({ mutationFn: (coachId: number) => unassignPrivateCourseCoach(courseId, coachId), onSuccess: refresh });
  return { assign, unassign };
}

export function useMyPrivateEnrollments(enabled = true) {
  return useQuery({
    queryKey: privateCourseKeys.enrollments(),
    queryFn: getMyPrivateEnrollments,
    retry: retryServerErrors,
    enabled,
    refetchInterval: (query) => query.state.data?.some((enrollment) => enrollment.status === 'PENDING_PAYMENT') ? 15_000 : false,
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
