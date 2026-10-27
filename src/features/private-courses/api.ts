import { apiClient } from '../../api/client';
import type { OccurrenceActionInput, OccurrenceChange, PrivateCourse, PrivateEnrollment } from './types';

type DataResponse<T> = { success: true; data: T };

export async function getPrivateCourses() {
  const { data } = await apiClient.get<DataResponse<PrivateCourse[]>>('/private-courses');
  return data.data;
}

export async function getPrivateCourse(courseId: number) {
  const { data } = await apiClient.get<DataResponse<PrivateCourse>>(`/private-courses/${courseId}`);
  return data.data;
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
