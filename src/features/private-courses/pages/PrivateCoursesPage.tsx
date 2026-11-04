import { BookOpenText } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { usePrivateCourses } from '../hooks/usePrivateCourses';

export function PrivateCoursesPage() {
  const courses = usePrivateCourses();
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const basePath = isManager ? '/app/private-courses' : '/member/private-courses';
  return (
    <div className={`mx-auto w-full max-w-[1100px] ${isManager ? '' : 'px-4 py-8 sm:px-6 lg:py-10'}`}>
      <PageHeader eyebrow="Khóa học cá nhân" title="Khóa học 1–1" description="Xem nội dung khóa học, môn thể thao, học phí và Coach được phân công." />
      {courses.isPending ? (
        <ListSkeleton label="Đang tải khóa học…" />
      ) : courses.isError ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} retrying={courses.isRefetching} pendingApi="GET /api/private-courses" />
      ) : courses.data.length === 0 ? (
        <EmptyState icon={<BookOpenText />} title="Chưa có khóa học đang mở" description="Hiện chưa có khóa học 1–1 nào khả dụng." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.data.map((course) => (
            <Card key={course.id} className="group overflow-hidden p-0">
              <div className="relative aspect-[16/8] overflow-hidden bg-primary/8">
                {course.sport.imageUrl ? <img src={course.sport.imageUrl} alt={`Khóa ${course.name}`} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid size-full place-items-center text-primary"><BookOpenText size={42} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
                <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-deep backdrop-blur">{course.sport.name}</span>
              </div>
              <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-extrabold text-ink">{course.name}</h2>
                <Chip tone="success" dot>Đang hoạt động</Chip>
              </div>
              {course.description && <p className="mt-3 line-clamp-3 text-sm text-muted">{course.description}</p>}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs text-muted">Học phí</p><p className="text-xl font-extrabold text-ink">{new Intl.NumberFormat('vi-VN').format(Number(course.price))} ₫</p><p className="text-xs text-muted">{course.totalSessions} buổi · {course.sessionDurationMinutes} phút/buổi</p></div>
                <Link to={`${basePath}/${course.id}`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-sm font-bold text-white hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Chi tiết khóa học</Link>
              </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
