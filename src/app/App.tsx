import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers';
import { router } from './router';
import { SportLoading } from '../components/feedback/SportLoading';

function RouteLoadingFallback() {
  return <SportLoading fullPage title="Đang mở không gian Sportigo" description="Sẵn sàng cho buổi tập tiếp theo của bạn." />;
}

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<RouteLoadingFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  );
}
