import { useMutation, useQuery } from '@tanstack/react-query';
import { getManagerDashboard, getMemberHome, getPublicLanding, readCachedPublicLanding, subscribeNewsletter } from './api';

export const usePublicLanding = () => useQuery({
  queryKey: ['public-landing'],
  queryFn: getPublicLanding,
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  placeholderData: readCachedPublicLanding,
  refetchOnWindowFocus: false,
});
export const useMemberHome = () => useQuery({ queryKey: ['member-home'], queryFn: getMemberHome, staleTime: 2 * 60_000 });
export const useManagerDashboard = () => useQuery({
  queryKey: ['manager-dashboard'],
  queryFn: getManagerDashboard,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});
export const useNewsletter = () => useMutation({ mutationFn: subscribeNewsletter });
