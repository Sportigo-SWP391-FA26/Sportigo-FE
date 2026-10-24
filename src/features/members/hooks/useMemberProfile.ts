import { useQuery } from '@tanstack/react-query';
import { retryServerErrors } from '../../training/errors';
import { getMemberProfile } from '../api';

export const memberKeys = {
  all: ['members'] as const,
  profile: (id: number) => [...memberKeys.all, 'profile', id] as const,
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
