import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Toaster } from '../components/feedback/Toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Áp dụng cho cả local và Vercel: giữ dữ liệu vừa tải khi chuyển trang
      // hoặc quay lại tab, thay vì gọi lại Supabase qua BE liên tục.
      staleTime: 2 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
