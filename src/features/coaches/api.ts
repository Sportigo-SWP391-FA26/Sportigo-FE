import { apiClient } from '../../api/client';
import type { StaffListPage } from '../staff/types';
import type { CoachAvailability, CoachScheduleItem, CoachSport, AvailabilityInput } from './types';

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
