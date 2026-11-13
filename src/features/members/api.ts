import { apiClient } from '../../api/client';
import type { CoachMembersPage, CoachMembersQuery, MemberProfile } from './types';

// FR-10
export async function getMemberProfile(id: number) {
  const { data } = await apiClient.get<MemberProfile>(`/members/${id}`);
  return data;
}

// FR-11
export async function listMyMembers(query: CoachMembersQuery) {
  const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''));
  const { data } = await apiClient.get<CoachMembersPage>('/coaches/me/members', { params });
  return data;
}
