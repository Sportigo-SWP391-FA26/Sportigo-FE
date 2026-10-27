import { CalendarBlank, FunnelSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Button } from '../../training/components/ui/Button';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { formatDate } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { getSports } from '../../training/api';
import { useQuery } from '@tanstack/react-query';
import { usePublicClasses } from '../bookingHooks';
import type { PublicClassFilters } from '../bookingTypes';

const PAGE_SIZE = 10;

export function ClassSchedulePage({ receptionistMode = false }: { receptionistMode?: boolean }) {
  const role = getSessionRole();
  const sports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: false });
  const [sportId, setSportId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [date, setDate] = useState('');
  const [filters, setFilters] = useState<PublicClassFilters>({ page: 1, limit: PAGE_SIZE });
  const classes = usePublicClasses(filters);
  const coachOptions = [...new Map((classes.data?.data ?? []).map((item) => [item.coachId, item.coach.user.displayName])).entries()];

  const applyFilters = () => {
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      ...(sportId ? { sportId: Number(sportId) } : {}),
      ...(coachId ? { coachId: Number(coachId) } : {}),
      ...(date ? { date } : {}),
    });
  };
  const setPage = (page: number) => setFilters((current) => ({ ...current, page }));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader eyebrow="Lớp nhóm" title={receptionistMode ? 'Đăng ký lớp cho hội viên' : 'Tìm lớp phù hợp'} description={receptionistMode ? 'Tìm lớp đang mở đăng ký để lập đơn cho hội viên đã có tài khoản.' : 'Xem các lớp đang mở đăng ký. Tình trạng chỗ và điều kiện đăng ký được xác nhận lại bởi backend khi bạn đăng ký.'} />
      <Card className="mb-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="block text-[13px] font-bold text-ink">Môn thể thao
            <select className="mt-1.5 block min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm" value={sportId} onChange={(event) => setSportId(event.target.value)} disabled={sports.isPending || sports.isError}>
              <option value="">Tất cả môn</option>
              {sports.data?.filter((sport) => sport.isActive).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
            </select>
          </label>
          <label className="block text-[13px] font-bold text-ink">Coach
            <select className="mt-1.5 block min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm" value={coachId} onChange={(event) => setCoachId(event.target.value)}>
              <option value="">Tất cả Coach</option>
              {coachOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="block text-[13px] font-bold text-ink">Ngày lớp diễn ra
            <input type="date" className="mt-1.5 block min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <Button icon={<FunnelSimple aria-hidden="true" />} onClick={applyFilters}>Lọc lớp</Button>
        </div>
        {sports.isError && <p role="alert" className="mt-3 text-sm text-danger">Không tải được danh sách môn: {parseApiError(sports.error).message}</p>}
        <p className="mt-3 text-xs text-muted">API chỉ trả lớp đang mở đăng ký. Bộ lọc Coach lấy các Coach xuất hiện trong trang kết quả hiện tại.</p>
      </Card>

      {classes.isPending ? (
        <ListSkeleton label="Đang tải lớp học…" />
      ) : classes.isError ? (
        <ErrorState error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isRefetching} pendingApi="GET /api/bookings/classes" />
      ) : classes.data.data.length === 0 ? (
        <EmptyState icon={<CalendarBlank />} title="Không tìm thấy lớp phù hợp" description="Thử bỏ bớt bộ lọc hoặc chọn một ngày khác." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {classes.data.data.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-deep">{item.sport.name}</p>
                    <h2 className="mt-1 text-lg font-extrabold text-ink">{item.name}</h2>
                    <p className="mt-1 text-sm text-muted">Coach {item.coach.user.displayName}</p>
                  </div>
                  <Chip tone="success" dot>Đang mở đăng ký</Chip>
                </div>
                {item.description && <p className="mt-3 line-clamp-2 text-sm text-muted">{item.description}</p>}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <p><span className="text-muted">Học phí</span><br /><strong>{new Intl.NumberFormat('vi-VN').format(Number(item.tuitionFee))} ₫</strong></p>
                  <p><span className="text-muted">Lớp</span><br /><strong>{formatDate(item.startDate)} – {formatDate(item.endDate)}</strong></p>
                  <p><span className="text-muted">Chỉ tiêu</span><br /><strong>{item.capacity} học viên</strong></p>
                  <p><span className="text-muted">Đã xác nhận</span><br /><strong>{item._count.registrations}</strong></p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link to={`${receptionistMode ? '/app/class-bookings' : '/member/classes'}/${item.id}`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-sm font-bold text-white hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{receptionistMode ? 'Đăng ký hộ' : 'Xem chi tiết'}</Link>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Trang {classes.data.pagination.page} / {Math.max(classes.data.pagination.totalPages, 1)} · {classes.data.pagination.total} lớp</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={classes.data.pagination.page <= 1 || classes.isFetching} onClick={() => setPage(classes.data.pagination.page - 1)}>Trang trước</Button>
              <Button variant="secondary" size="sm" disabled={classes.data.pagination.page >= classes.data.pagination.totalPages || classes.isFetching} onClick={() => setPage(classes.data.pagination.page + 1)}>Trang sau</Button>
            </div>
          </div>
        </>
      )}
      {role && role !== 'MEMBER' && <p className="mt-4 text-sm text-muted">Tài khoản hiện tại không phải Member; đăng ký lớp chỉ dành cho Member.</p>}
    </div>
  );
}
