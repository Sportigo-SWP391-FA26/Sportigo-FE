import { apiClient } from '../../api/client';
import type { CreatePrivateCourseInput, OccurrenceActionInput, OccurrenceChange, PrivateCourse, PrivateEnrollment, UpdatePrivateCourseInput } from './types';

type DataResponse<T> = { success: true; data: T };

export async function getPrivateCourses() {
  const { data } = await apiClient.get<DataResponse<PrivateCourse[]>>('/private-courses');
  return data.data;
}

export async function getPrivateCourse(courseId: number) {
  const { data } = await apiClient.get<DataResponse<PrivateCourse>>(`/private-courses/${courseId}`);
  return data.data;
}

export async function createPrivateCourse(input: CreatePrivateCourseInput) {
  const { data } = await apiClient.post<DataResponse<PrivateCourse>>('/private-courses', input);
  return data.data;
}

export async function updatePrivateCourse(courseId: number, input: UpdatePrivateCourseInput) {
  const { data } = await apiClient.patch<DataResponse<PrivateCourse>>(`/private-courses/${courseId}`, input);
  return data.data;
}

export async function deletePrivateCourse(courseId: number) {
  await apiClient.delete(`/private-courses/${courseId}`);
}

export async function assignPrivateCourseCoach(courseId: number, coachId: number) {
  await apiClient.post(`/private-courses/${courseId}/coaches`, { coachId });
}

export async function unassignPrivateCourseCoach(courseId: number, coachId: number) {
  await apiClient.delete(`/private-courses/${courseId}/coaches/${coachId}`);
}

export async function getMyPrivateEnrollments() {
  const { data } = await apiClient.get<DataResponse<PrivateEnrollment[]>>('/private-courses/enrollments');
  return data.data;
}

export async function changePrivateOccurrence(
  enrollmentId: number,
  scheduleId: number,
  sessionDate: string,
  input: OccurrenceActionInput,
) {
  const { data } = await apiClient.patch<DataResponse<OccurrenceChange>>(
    `/private-courses/enrollments/${enrollmentId}/schedules/${scheduleId}/occurrences/${sessionDate}`,
    input,
  );
  return data.data;
}

export async function completePrivateSession(enrollmentId: number, scheduleId: number, sessionDate: string) {
  const { data } = await apiClient.post<DataResponse<{ id: number; sessionDate: string }>>(
    `/private-courses/enrollments/${enrollmentId}/schedules/${scheduleId}/attendance`,
    { sessionDate },
  );
  return data.data;
}
