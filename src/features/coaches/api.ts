import { apiClient } from '../../api/client';
import type { StaffListPage } from '../staff/types';
import type { CoachAvailability, CoachScheduleItem, CoachSport, AvailabilityInput, AvailabilityCalendar, AvailabilityChangeRequest, AvailabilitySubmission } from './types';

type DataResponse<T> = { success: true; data: T };

export async function getCoachSports(coachId: number) {
  const { data } = await apiClient.get<DataResponse<CoachSport[]>>(`/coaches/${coachId}/sports`);
  return data.data;
}

export async function assignCoachSport(coachId: number, sportId: number) {
  const { data } = await apiClient.post<DataResponse<unknown>>(`/coaches/${coachId}/sports`, { sportId });
  return data.data;
}

export async function removeCoachSport(coachId: number, sportId: number) {
  const { data } = await apiClient.delete<DataResponse<{ coachId: number; sportId: number; removed: boolean }>>(
    `/coaches/${coachId}/sports/${sportId}`,
  );
  return data.data;
}

export async function getCoachAvailability(coachId: number) {
  const { data } = await apiClient.get<DataResponse<CoachAvailability[]>>(`/coaches/${coachId}/availability`);
  return data.data;
}

export async function createCoachAvailability(coachId: number, input: AvailabilityInput) {
  const { data } = await apiClient.post<DataResponse<CoachAvailability>>(`/coaches/${coachId}/availability`, input);
  return data.data;
}

export async function updateCoachAvailability(
  coachId: number,
  availabilityId: number,
  input: AvailabilityInput,
) {
  const { data } = await apiClient.put<DataResponse<CoachAvailability>>(
    `/coaches/${coachId}/availability/${availabilityId}`,
    input,
  );
  return data.data;
}

export async function deleteCoachAvailability(coachId: number, availabilityId: number) {
  const { data } = await apiClient.delete<DataResponse<{ id: number; status: 'UNAVAILABLE' }>>(
    `/coaches/${coachId}/availability/${availabilityId}`,
  );
  return data.data;
}

export async function getCoachSchedule(coachId: number, from: string, to: string) {
  const { data } = await apiClient.get<DataResponse<CoachScheduleItem[]>>(`/coaches/${coachId}/schedule`, {
    params: { from, to },
  });
  return data.data;
}

export async function getCoaches() {
  const pageSize = 100;
  const first = await apiClient.get<StaffListPage>('/staff', { params: { role: 'COACH', page: 1, pageSize } });
  const pages = Math.ceil(first.data.total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      apiClient.get<StaffListPage>('/staff', {
        params: { role: 'COACH', page: index + 2, pageSize },
      }),
    ),
  );
  return [first.data, ...rest.map((response) => response.data)].flatMap((page) => page.items);
}

export async function getMyAvailabilityCalendar(month: string) {
  const { data } = await apiClient.get<AvailabilityCalendar>('/coaches/me/availability-calendar', { params: { month } });
  return data;
}

export async function saveMyAvailabilityDraft(month: string, selections: Array<{ dayOfWeek: number; shiftCode: string }>) {
  const { data } = await apiClient.put<AvailabilitySubmission>(`/coaches/me/availability-submissions/${month}/draft`, { selections });
  return data;
}

export async function submitMyAvailability(month: string) {
  const { data } = await apiClient.post<AvailabilitySubmission>(`/coaches/me/availability-submissions/${month}/submit`);
  return data;
}

export async function createAvailabilityChangeRequest(input: { month: string; oldDayOfWeek: number; oldShiftCode: string; newDayOfWeek: number; newShiftCode: string; reason: string }) {
  const { data } = await apiClient.post<AvailabilityChangeRequest>('/coaches/me/availability-change-requests', input);
  return data;
}

export async function getMyAvailabilityChangeRequests() {
  const { data } = await apiClient.get<AvailabilityChangeRequest[]>('/coaches/me/availability-change-requests');
  return data;
}

export async function getAvailabilitySubmissions(params?: { month?: string; status?: string; coachId?: number }) {
  const { data } = await apiClient.get<AvailabilitySubmission[]>('/coach-availability-submissions', { params });
  return data;
}

export async function reviewAvailabilitySubmission(id: number, input: { decision: 'APPROVE' | 'REJECT'; reason?: string }) {
  const { data } = await apiClient.post<AvailabilitySubmission>(`/coach-availability-submissions/${id}/review`, input);
  return data;
}

export async function getAvailabilityChangeRequests(params?: { status?: string; coachId?: number }) {
  const { data } = await apiClient.get<AvailabilityChangeRequest[]>('/coach-availability-change-requests', { params });
  return data;
}

export async function reviewAvailabilityChangeRequest(id: number, input: { decision: 'APPROVE' | 'REJECT'; reason?: string }) {
  const { data } = await apiClient.post<AvailabilityChangeRequest>(`/coach-availability-change-requests/${id}/review`, input);
  return data;
}
