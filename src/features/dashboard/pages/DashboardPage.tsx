import { ArrowRight, CalendarCheck, Clock, CurrencyCircleDollar, DoorOpen, Lifebuoy, Receipt, TrendUp, UsersThree } from '@phosphor-icons/react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useManagerDashboard } from '../../content/hooks';
import { Card, PageHeader, SectionHeading, StatTile } from '../../../components/ui/Card';
import { ErrorState, ListSkeleton } from '../../../components/ui/States';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const DashboardCharts = lazy(() => import('../components/DashboardCharts'));

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function revenueDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 'Phát sinh doanh thu trong tháng' : 'Chưa có giao dịch thành công';
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(delta).toFixed(1)}% so với tháng trước`;
}

export function DashboardPage() {
  const dashboard = useManagerDashboard();

  if (dashboard.isPending) return <section><PageHeader eyebrow="CENTER MANAGER" title="Tổng quan trung tâm" description="Đang đồng bộ dữ liệu vận hành mới nhất." /><ListSkeleton rows={6} label="Đang tải số liệu dashboard" /></section>;
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} retrying={dashboard.isRefetching} pendingApi="GET /api/reports/dashboard" />;

  const data = dashboard.data;
  const currentRevenue = Number(data.monthlyRevenue);
  const previousRevenue = Number(data.previousMonthRevenue);
  const totalClasses = Object.values(data.classStatus).reduce((sum, value) => sum + value, 0);
  const actionItems = [
    { label: 'Yêu cầu hoàn tiền', count: data.pendingRefunds, path: '/app/refunds', icon: <Receipt /> },
    { label: 'Yêu cầu hỗ trợ', count: data.openSupportRequests, path: '/app/support', icon: <Lifebuoy /> },
    { label: 'Đơn chờ thanh toán', count: data.pendingOrders, path: '/app/revenue', icon: <Clock /> },
  ];

  return (
    <section className="space-y-6 pb-8">
      <PageHeader
        eyebrow="CENTER MANAGER"
        title="Trung tâm hôm nay"
        description="Theo dõi sức khỏe vận hành, doanh thu và các đầu việc cần xử lý từ một màn hình."
        actions={<Link to="/app/operations-report" className="inline-flex items-center gap-2 rounded-control bg-primary-deep px-4 py-2.5 text-sm font-bold text-white hover:bg-primary">Xem báo cáo chi tiết <ArrowRight /></Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Hội viên hoạt động" value={data.activeMembers.toLocaleString('vi-VN')} hint={`+${data.newMembersThisMonth} hội viên mới trong tháng`} icon={<UsersThree />} tone="primary" />
        <StatTile label="Buổi học hôm nay" value={data.classesToday.toLocaleString('vi-VN')} hint={`${data.upcomingSessions.length} buổi sắp diễn ra`} icon={<CalendarCheck />} tone="lime" />
        <StatTile label="Phòng đang sử dụng" value={`${data.roomsInUse}/${data.totalRooms}`} hint={`${data.roomsInMaintenance} phòng đang bảo trì`} icon={<DoorOpen />} tone="energy" />
        <StatTile label="Doanh thu tháng" value={money.format(currentRevenue)} hint={revenueDelta(currentRevenue, previousRevenue)} icon={<CurrencyCircleDollar />} tone="sky" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.7fr)]">
        <Card className="min-w-0 p-5 sm:p-6">
          <SectionHeading title="Xu hướng 6 tháng" description="Doanh thu đã thanh toán và số lượt đăng ký lớp theo tháng." />
          <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-canvas" />}>
            <DashboardCharts trend={data.trend} compactMoney={compactMoney} />
          </Suspense>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeading title="Cần xử lý" description="Các đầu việc đang chờ tại trung tâm." />
          <div className="divide-y divide-line">
            {actionItems.map((item) => (
              <Link key={item.path} to={item.path} className="group flex items-center gap-3 py-4 first:pt-1">
                <span className="grid size-10 place-items-center rounded-xl bg-canvas text-lg text-primary-deep">{item.icon}</span>
                <span className="min-w-0 flex-1 text-sm font-bold text-ink group-hover:text-primary">{item.label}</span>
                <strong className={`min-w-8 rounded-full px-2 py-1 text-center text-xs ${item.count ? 'bg-accent-energy/12 text-accent-energy' : 'bg-canvas text-muted'}`}>{item.count}</strong>
                <ArrowRight className="text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <Card className="p-5 sm:p-6">
          <SectionHeading title="Lịch sắp tới" description="Năm buổi học gần nhất đã được xếp lịch." actions={<Link to="/app/classes" className="text-sm font-bold text-primary hover:text-primary-deep">Tất cả lớp</Link>} />
          {data.upcomingSessions.length === 0 ? (
            <p className="rounded-card bg-canvas px-4 py-8 text-center text-sm text-muted">Chưa có buổi học sắp tới.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead><tr className="border-b border-line text-xs uppercase tracking-wide text-muted"><th className="pb-3 font-bold">Lớp học</th><th className="pb-3 font-bold">Thời gian</th><th className="pb-3 font-bold">Coach</th><th className="pb-3 font-bold">Phòng</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {data.upcomingSessions.map((session) => (
                    <tr key={session.id}>
                      <td className="py-3.5 pr-4"><p className="font-bold text-ink">{session.className}</p><p className="mt-0.5 text-xs text-muted">{session.sport.name}</p></td>
                      <td className="py-3.5 pr-4 font-semibold text-ink">{dateTime.format(new Date(session.startsAt))}</td>
                      <td className="py-3.5 pr-4 text-muted">{session.coach.displayName}</td>
                      <td className="py-3.5 text-muted">{session.room.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeading title="Trạng thái lớp" description={`${totalClasses} lớp trong toàn hệ thống.`} />
          <div className="space-y-4">
            {[
              ['Đang mở đăng ký', data.classStatus.OPEN ?? 0, 'bg-primary'],
              ['Đang diễn ra', data.classStatus.IN_PROGRESS ?? 0, 'bg-accent-lime'],
              ['Đã hoàn thành', data.classStatus.COMPLETED ?? 0, 'bg-accent-sky'],
              ['Đã đóng / hủy', (data.classStatus.CLOSED ?? 0) + (data.classStatus.CANCELLED ?? 0), 'bg-muted'],
            ].map(([label, count, color]) => {
              const numericCount = Number(count);
              const percent = totalClasses ? Math.round((numericCount / totalClasses) * 100) : 0;
              return (
                <div key={String(label)}>
                  <div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-semibold text-ink">{label}</span><span className="font-bold text-muted">{numericCount}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-canvas"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-card bg-primary-deep p-4 text-white">
            <TrendUp size={28} className="text-accent-sky" />
            <div><p className="text-xs font-bold uppercase tracking-wide text-white/60">Doanh thu tháng</p><p className="mt-0.5 text-lg font-extrabold">{compactMoney.format(currentRevenue)} ₫</p></div>
          </div>
        </Card>
      </div>
    </section>
  );
}
