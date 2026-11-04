import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

type Options = {
  path?: string;
  route?: string;
};

// Render trong data router thật để dùng được useBlocker, useSearchParams...
export function renderWithProviders(ui: ReactElement, { path = '/', route = '/' }: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path, element: ui }, { path: '*', element: <p>Trang khác</p> }], {
    initialEntries: [route],
  });
  return {
    queryClient,
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
