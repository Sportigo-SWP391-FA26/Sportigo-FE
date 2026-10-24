import { apiClient } from '../../api/client';
import type { MyProfile, UpdateProfileInput } from './types';

// FR-05
export async function getMyProfile() {
  const { data } = await apiClient.get<MyProfile>('/users/me');
  return data;
}

export async function updateMyProfile(input: UpdateProfileInput) {
  const { data } = await apiClient.patch<MyProfile>('/users/me', input);
  return data;
}
