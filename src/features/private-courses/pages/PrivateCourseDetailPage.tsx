import { ArrowLeft, Clock } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Card, PageHeader, SectionHeading } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { formatDate } from '../../training/format';
import { usePrivateCourse } from '../hooks/usePrivateCourses';

const DAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const clock = (value: string) => value.slice(11, 16);

export function PrivateCourseDetailPage() {
  const courseId = Number(useParams().courseId);
  const course = usePrivateCourse(courseId);
  const basePath = getSessionRole() === 'CENTER_MANAGER' ? '/app/private-courses' : '/member/private-courses';

  if (!Number.isInteger(courseId) || courseId <= 0) return <ErrorState error={new Error('ID khóa học không hợp lệ.')} />;
  if (course.isPending) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ListSkeleton label="Đang tải chi tiết khóa học…" /></div>;
  if (course.isError) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ErrorState error={course.error} onRetry={() => course.refetch()} retrying={course.isRefetching} pendingApi="GET /api/private-courses/:id" /></div>;
  if (!course.data) return <div className="mx-auto max-w-[1100px] px-4 py-8"><EmptyState title="Không tìm thấy khóa học" description="Khóa học có thể không còn tồn tại hoặc đã bị gỡ." /></div>;

  const item = course.data;
  const coaches = item.coaches.filter((assignment) => assignment.isActive);
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        eyebrow="Chi tiết khóa 1–1"
        title={item.name}
        description={item.description ?? 'Thông tin khóa học và Coach được phân công.'}
        back={<Link to={basePath} className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-primary-deep hover:underline"><ArrowLeft aria-hidden="true" /> Danh sách khóa học</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="text-xs font-bold text-muted">Môn thể thao</p><p className="mt-1 text-lg font-extrabold">{item.sport.name}</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Học phí</p><p className="mt-1 text-lg font-extrabold">{new Intl.NumberFormat('vi-VN').format(Number(item.price))} ₫</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Số buổi</p><p className="mt-1 text-lg font-extrabold">{item.totalSessions} buổi</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Thời hạn khóa</p><p className="mt-1 text-lg font-extrabold">{item.validityDays} ngày</p><p className="text-xs text-muted">{item.sessionDurationMinutes} phút mỗi buổi</p></Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeading title="Coach được phân công" description="Availability hiển thị theo dữ liệu lịch khả dụng mà API trả về." />
        {coaches.length === 0 ? (
          <EmptyState compact title="Chưa có Coach được phân công" description="Vui lòng liên hệ trung tâm để biết thêm thông tin." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {coaches.map((assignment) => {
              const availability = assignment.coach.availabilities.filter((slot) => slot.status === 'AVAILABLE');
              return (
                <article key={assignment.coachId} className="rounded-card border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-extrabold text-ink">{assignment.coach.user.displayName}</h3>
                    <Chip tone="success" dot>Được phân công</Chip>
                  </div>
                  {assignment.customPrice !== null && <p className="mt-2 text-sm text-muted">Giá áp dụng với Coach này: <strong className="text-ink">{new Intl.NumberFormat('vi-VN').format(Number(assignment.customPrice))} ₫</strong></p>}
                  <h4 className="mt-4 flex items-center gap-2 text-sm font-bold text-ink"><Clock aria-hidden="true" /> Availability</h4>
                  {availability.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">API không trả khung availability đang hoạt động.</p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {availability.map((slot) => <li key={slot.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2"><span>{DAYS[slot.dayOfWeek] ?? `Thứ ${slot.dayOfWeek}`}</span><span className="font-semibold">{clock(slot.startTime)}–{clock(slot.endTime)}</span><span className="w-full text-xs text-muted">{formatDate(slot.effectiveFrom)} – {slot.effectiveTo ? formatDate(slot.effectiveTo) : 'Không giới hạn'}</span></li>)}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
