import { apiClient } from '../../api/client';
import type { MemberProfile } from './types';

// FR-10
export async function getMemberProfile(id: number) {
  const { data } = await apiClient.get<MemberProfile>(`/members/${id}`);
  return data;
}
