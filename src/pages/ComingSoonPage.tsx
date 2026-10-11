import { useLocation } from 'react-router-dom';
import { centerManagerNavigation } from '../config/navigation';

const memberLabels: Record<string, string> = {
  '/member/private-courses': 'Khóa 1–1',
  '/member/my-schedule': 'Lịch của tôi',
  '/member/progress': 'Tiến độ',
  '/member/payments': 'Thanh toán',
};

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const page = centerManagerNavigation.find((item) => item.path === pathname);
  const title = memberLabels[pathname] ?? page?.label ?? 'Trang chức năng';

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">
        {title}
      </h1>
      <p className="mt-2 text-slate-500">
        Module này đã có tuyến điều hướng và sẵn sàng để phát triển.
      </p>
    </section>
  );
}
