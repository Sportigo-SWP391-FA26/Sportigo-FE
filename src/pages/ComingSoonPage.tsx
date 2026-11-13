import { ArrowLeft, CirclesThreePlus } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { ButtonLink } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/States';
import { centerManagerNavigation } from '../config/navigation';

const memberLabels: Record<string, string> = {
  '/member/private-courses': 'Khóa 1–1',
  '/member/my-schedule': 'Lịch của tôi',
  '/member/progress': 'Tiến độ',
  '/member/payments': 'Thanh toán',
};

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const managerPages = centerManagerNavigation.flatMap((entry) => 'items' in entry ? entry.items : [entry]);
  const page = managerPages.find((item) => item.path === pathname);
  const title = memberLabels[pathname] ?? page?.label ?? 'Trang chức năng';
  const isMember = pathname.startsWith('/member');

  return (
    <div>
      <PageHeader
        eyebrow={isMember ? 'Sportigo Member' : 'Center Manager'}
        title={title}
        description="Khu vực này đã có tuyến điều hướng và đang được hoàn thiện để kết nối dữ liệu nghiệp vụ."
      />
      <Card>
        <EmptyState
          compact
          icon={<CirclesThreePlus />}
          title="Chức năng đang được hoàn thiện"
          description="Bạn có thể quay về trang tổng quan để tiếp tục sử dụng các chức năng đã sẵn sàng."
          action={<ButtonLink to={isMember ? '/member/home' : '/app'} icon={<ArrowLeft aria-hidden="true" />}>Về trang tổng quan</ButtonLink>}
        />
      </Card>
    </div>
  );
}
