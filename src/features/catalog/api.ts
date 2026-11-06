import { apiClient } from '../../api/client';
import type { AssessmentMetric, AssessmentMetricInput, Room, RoomInput, Sport, SportInput } from './types';

type DataResponse<T> = { success: true; data: T };

export async function getSports() {
  const { data } = await apiClient.get<DataResponse<Sport[]>>('/sports');
  return data.data;
}

export async function createSport(input: SportInput) {
  const { data } = await apiClient.post<DataResponse<Sport>>('/sports', input);
  return data.data;
}

export async function updateSport(id: number, input: Partial<SportInput>) {
  const { data } = await apiClient.put<DataResponse<Sport>>(`/sports/${id}`, input);
  return data.data;
}

export async function getAssessmentMetrics(sportId: number) {
  const { data } = await apiClient.get<AssessmentMetric[]>(`/sports/${sportId}/assessment-metrics`);
  return data;
}
export async function createAssessmentMetric(sportId: number, input: AssessmentMetricInput) {
  const { data } = await apiClient.post<AssessmentMetric>(`/sports/${sportId}/assessment-metrics`, input);
  return data;
}
export async function updateAssessmentMetric(sportId: number, id: number, input: Partial<AssessmentMetricInput>) {
  const { data } = await apiClient.patch<AssessmentMetric>(`/sports/${sportId}/assessment-metrics/${id}`, input);
  return data;
}

export async function getRooms() {
  const { data } = await apiClient.get<DataResponse<Room[]>>('/rooms');
  return data.data;
}

export async function createRoom(input: RoomInput) {
  const { data } = await apiClient.post<DataResponse<Room>>('/rooms', input);
  return data.data;
}

export async function updateRoom(id: number, input: Partial<RoomInput>) {
  const { data } = await apiClient.put<DataResponse<Room>>(`/rooms/${id}`, input);
  return data.data;
}
