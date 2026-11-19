import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { getMemberProfile, listMyMembers } from '../api';
import type { CoachMembersQuery } from '../types';

export const memberKeys = {
  all: ['members'] as const,
  profile: (id: number) => [...memberKeys.all, 'profile', id] as const,
  coachList: (query: CoachMembersQuery) => [...memberKeys.all, 'coach-list', query] as const,
};

// FR-10
export function useMemberProfile(id: number) {
  return useQuery({
    queryKey: memberKeys.profile(id),
    queryFn: () => getMemberProfile(id),
    retry: retryServerErrors,
    // note: id lỗi (NaN) từ URL thì không gọi API
    enabled: Number.isInteger(id) && id > 0,
  });
}

// FR-11
export function useMyMembers(query: CoachMembersQuery) {
  return useQuery({
    queryKey: memberKeys.coachList(query),
    queryFn: () => listMyMembers(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}
