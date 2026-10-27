import { apiClient } from '../../api/client';
import type {
  ChangeSessionInput,
  ClassSession,
  CreateGroupClassInput,
  CreateRecurringSessionsInput,
  CreateSessionInput,
  GroupClass,
  GroupClassStatus,
  UpdateGroupClassInput,
} from './types';

type DataResponse<T> = { success: true; data: T };

export async function getGroupClasses() {
  const { data } = await apiClient.get<DataResponse<GroupClass[]>>('/group-classes');
  return data.data;
}

export async function getGroupClassSessions(classId: number) {
  const { data } = await apiClient.get<DataResponse<ClassSession[]>>(`/group-classes/${classId}/sessions`);
  return data.data;
}

export async function updateGroupClass(classId: number, input: UpdateGroupClassInput) {
  const { data } = await apiClient.patch<DataResponse<GroupClass>>(`/group-classes/${classId}`, input);
  return data.data;
}

export async function createGroupClass(input: CreateGroupClassInput) {
  const { data } = await apiClient.post<DataResponse<GroupClass>>('/group-classes', input);
  return data.data;
}

export async function updateGroupClassStatus(classId: number, status: GroupClassStatus) {
  const { data } = await apiClient.patch<DataResponse<GroupClass>>(`/group-classes/${classId}/status`, { status });
  return data.data;
}

export async function createClassSession(classId: number, input: CreateSessionInput) {
  const { data } = await apiClient.post<DataResponse<ClassSession>>(`/group-classes/${classId}/sessions`, input);
  return data.data;
}

export async function createRecurringClassSessions(classId: number, input: CreateRecurringSessionsInput) {
  const { data } = await apiClient.post<DataResponse<ClassSession[]>>(`/group-classes/${classId}/sessions/recurring`, input);
  return data.data;
}

export async function changeClassSession(sessionId: number, input: ChangeSessionInput) {
  const { data } = await apiClient.post<DataResponse<ClassSession>>(`/class-sessions/${sessionId}/change`, input);
  return data.data;
}

export async function cancelClassSession(sessionId: number, reason: string) {
  const { data } = await apiClient.post<DataResponse<ClassSession>>(`/class-sessions/${sessionId}/cancel`, { reason });
  return data.data;
}
