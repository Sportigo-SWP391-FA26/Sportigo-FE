import { useLocation } from 'react-router-dom';
import { centerManagerNavigation } from '../config/navigation';

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const page = centerManagerNavigation.find((item) => item.path === pathname);

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">
        {page?.label ?? 'Trang chức năng'}
      </h1>
      <p className="mt-2 text-slate-500">
        Module này đã có tuyến điều hướng và sẵn sàng để phát triển.
      </p>
    </section>
  );
}
