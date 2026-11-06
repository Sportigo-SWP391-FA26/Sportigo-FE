import { apiClient } from '../../api/client';
import type { ClassRegistrationOrder, MyClassRegistration, PublicClassDetail, PublicClassFilters, PublicClassPage, WaitlistEntry, WaitlistFilters, WaitlistHistory, WaitlistPage, WaitlistRecord, WaitlistResponse } from './bookingTypes';

type DataResponse<T> = { success: true; data: T };

export async function getPublicClasses(filters: PublicClassFilters) {
  const { data } = await apiClient.get<DataResponse<PublicClassPage>>('/bookings/classes', { params: filters });
  return data.data;
}

export async function getPublicClass(classId: number) {
  const { data } = await apiClient.get<DataResponse<PublicClassDetail>>(`/bookings/classes/${classId}`);
  return data.data;
}

export async function getMyClassRegistrations() {
  const { data } = await apiClient.get<DataResponse<MyClassRegistration[]>>('/bookings/registrations/me');
  return data.data;
}

export async function registerForClass(classId: number) {
  const { data } = await apiClient.post<DataResponse<ClassRegistrationOrder>>(`/bookings/classes/${classId}/register`);
  return data.data;
}

export async function registerMemberOnBehalf(classId: number, memberId: number) {
  const { data } = await apiClient.post<DataResponse<ClassRegistrationOrder>>(`/group-classes/${classId}/register-on-behalf`, { memberId });
  return data.data;
}

export async function joinClassWaitlist(classId: number) {
  const { data } = await apiClient.post<DataResponse<WaitlistEntry>>(`/group-classes/${classId}/waitlist`);
  return data.data;
}

export async function respondToClassWaitlist(classId: number, accept: boolean) {
  const { data } = await apiClient.post<DataResponse<WaitlistResponse>>(
    `/group-classes/${classId}/waitlist/respond`,
    { accept },
  );
  return data.data;
}

export async function getMyWaitlists() {
  const { data } = await apiClient.get<DataResponse<{ items: WaitlistRecord[] }>>('/waitlist/me');
  return data.data.items;
}

export async function getWaitlists(filters: WaitlistFilters) {
  const { data } = await apiClient.get<DataResponse<WaitlistPage>>('/waitlist', { params: filters });
  return data.data;
}

export async function getWaitlistHistory(waitlistId: number) {
  const { data } = await apiClient.get<DataResponse<WaitlistHistory>>(`/waitlist/${waitlistId}/history`);
  return data.data;
}

export async function cancelClassRegistration(registrationId: number) {
  const { data } = await apiClient.post<DataResponse<unknown>>(`/bookings/registrations/${registrationId}/cancel`);
  return data.data;
}
