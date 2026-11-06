import {
  ArrowRight,
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  CheckCircle,
  Clock,
  Student,
  UsersThree,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../../../components/ui/Button';
import { Card, SectionHeading, StatTile } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '../../../components/ui/States';
import { useMyMembers } from '../../members/hooks/useMemberProfile';
import { useMyProfile } from '../../profile/hooks/useMyProfile';
import { addDays, formatDate, formatTime, todayInCenter } from '../../training/format';
import { useAssessments } from '../../training/hooks/useAssessments';
import { useCoachSchedule, useMyAvailabilityCalendar } from '../hooks/useCoachManagement';
import type { CoachScheduleItem } from '../types';

const centerDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Cần chỉnh sửa',
};

function dateKey(value: string) {
  return centerDateFormatter.format(new Date(value));
}

function scheduleName(item: CoachScheduleItem) {
  return item.type === 'GROUP_CLASS' ? item.groupClass.name : item.enrollment.privateCourse.name;
}

function scheduleContext(item: CoachScheduleItem) {
  if (item.type === 'GROUP_CLASS') return `Lớp nhóm${item.room ? ` · ${item.room.name}` : ''}`;
  return `Khóa 1–1 · ${item.enrollment.member.user.displayName}${item.room ? ` · ${item.room.name}` : ''}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải Coach Dashboard">
      <Skeleton className="h-32 w-full rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-card" />)}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]"><Skeleton className="h-96 rounded-card" /><Skeleton className="h-96 rounded-card" /></div>
    </div>
  );
}

export function CoachDashboardPage() {
  const profile = useMyProfile();
  const today = todayInCenter();
  const weekEnd = addDays(today, 6);
  const month = today.slice(0, 7);
  const coachId = profile.data?.role === 'COACH' ? profile.data.id : 0;
  const schedule = useCoachSchedule(coachId, today, weekEnd, coachId > 0);
  const members = useMyMembers({ page: 1, pageSize: 100 });
  const assessments = useAssessments({ page: 1, pageSize: 5 });
  const availability = useMyAvailabilityCalendar(month);

  if (profile.isPending) return <DashboardSkeleton />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isRefetching} pendingApi="GET /api/users/me" />;

  const weekSchedule = [...(schedule.data ?? [])].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const todaySchedule = weekSchedule.filter((item) => dateKey(item.startsAt) === today && item.status !== 'CANCELLED');
  const upcomingSchedule = weekSchedule.filter((item) => item.status !== 'CANCELLED').slice(0, 6);
  const memberItems = members.data?.items ?? [];
  const dueMembers = memberItems
    .filter((member) => {
      const nextDate = member.goals.latestAssessment?.nextAssessmentDate;
      return !member.goals.latestAssessment || Boolean(nextDate && nextDate <= today);
    })
    .slice(0, 4);
  const assessmentItems = assessments.data?.items ?? [];
  const availabilitySubmission = availability.data?.submission;
  const selectedDays = new Set(availabilitySubmission?.selections.map((item) => item.dayOfWeek) ?? []).size;
  const firstName = profile.data.displayName.trim().split(/\s+/).at(-1) ?? profile.data.displayName;

  return (
    <section className="mx-auto w-full max-w-[1380px] space-y-6 pb-8">
      <div className="overflow-hidden rounded-card bg-primary-deep px-5 py-6 text-white shadow-[0_18px_50px_rgb(15_43_92_/_14%)] sm:px-7 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="text-sm font-bold text-accent-sky">{longDateFormatter.format(new Date())}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] sm:text-4xl">Chào Coach {firstName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/72">Theo dõi lịch dạy, học viên và các đầu việc chuyên môn trong tuần này.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 lg:mt-0">
          <ButtonLink to="/coach/schedule" variant="secondary">Xem lịch dạy</ButtonLink>
          <ButtonLink to="/coach/assessments/new">Ghi đánh giá</ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Buổi dạy hôm nay" value={schedule.isPending ? '—' : todaySchedule.length} hint={`${weekSchedule.length} buổi trong 7 ngày`} icon={<CalendarCheck />} tone="primary" />
        <StatTile label="Học viên đang phụ trách" value={members.isPending ? '—' : members.data?.total ?? 0} hint="Từ lớp nhóm và khóa 1–1" icon={<UsersThree />} tone="lime" />
        <StatTile label="Cần theo dõi" value={members.isPending ? '—' : dueMembers.length} hint="Chưa có hoặc đến hạn đánh giá" icon={<Student />} tone="energy" />
        <StatTile label="Đánh giá đã ghi" value={assessments.isPending ? '—' : assessments.data?.total ?? 0} hint="Lịch sử đánh giá của bạn" icon={<ChartLineUp />} tone="sky" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <Card className="min-w-0 p-5 sm:p-6">
          <SectionHeading
            title="Lịch dạy sắp tới"
            description={`Các buổi từ ${formatDate(today)} đến ${formatDate(weekEnd)}.`}
            actions={<Link to="/coach/schedule" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-deep">Xem toàn bộ <ArrowRight /></Link>}
          />
          {schedule.isPending ? (
            <ListSkeleton rows={4} label="Đang tải lịch dạy…" />
          ) : schedule.isError ? (
            <ErrorState compact error={schedule.error} onRetry={() => schedule.refetch()} retrying={schedule.isRefetching} pendingApi="GET /api/coaches/:id/schedule" />
          ) : upcomingSchedule.length === 0 ? (
            <EmptyState compact icon={<CalendarDots />} title="Tuần này chưa có lịch dạy" description="Lịch lớp nhóm và khóa 1–1 được phân công sẽ xuất hiện tại đây." />
          ) : (
            <ol className="divide-y divide-line">
              {upcomingSchedule.map((item) => (
                <li key={`${item.type}-${item.id}-${item.startsAt}`} className="grid gap-3 py-4 first:pt-1 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-extrabold text-primary-deep">{formatDate(item.startsAt)}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatTime(item.startsAt)}–{formatTime(item.endsAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-ink">{scheduleName(item)}</p>
                    <p className="mt-1 truncate text-xs text-muted">{scheduleContext(item)}</p>
                  </div>
                  <Chip tone={item.type === 'GROUP_CLASS' ? 'success' : 'warning'}>{item.type === 'GROUP_CLASS' ? 'Lớp nhóm' : 'Khóa 1–1'}</Chip>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeading title="Availability tháng này" description="Trạng thái lịch ca bạn đăng ký với Center Manager." />
          {availability.isPending ? (
            <ListSkeleton rows={2} label="Đang tải availability…" />
          ) : availability.isError ? (
            <ErrorState compact error={availability.error} onRetry={() => availability.refetch()} retrying={availability.isRefetching} pendingApi="GET /api/coaches/me/availability-calendar" />
          ) : availabilitySubmission ? (
            <div>
              <div className="flex items-start justify-between gap-3 rounded-card bg-canvas p-4">
                <div>
                  <p className="text-xs font-bold text-muted">Tháng {month.slice(5, 7)}/{month.slice(0, 4)}</p>
                  <p className="mt-1 text-xl font-extrabold text-ink">{availabilitySubmission.selections.length} ca · {selectedDays} ngày</p>
                </div>
                <Chip tone={availabilitySubmission.status === 'APPROVED' ? 'success' : availabilitySubmission.status === 'REJECTED' ? 'danger' : availabilitySubmission.status === 'SUBMITTED' ? 'warning' : 'neutral'} dot>
                  {statusLabels[availabilitySubmission.status] ?? availabilitySubmission.status}
                </Chip>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex items-center gap-2 text-muted"><CheckCircle className="shrink-0 text-accent-lime" /> Tối thiểu {availability.data.rules.minimumShifts} ca trên {availability.data.rules.minimumDays} ngày</p>
                <p className="flex items-center gap-2 text-muted"><Clock className="shrink-0 text-primary" /> Hạn gửi ngày {availability.data.rules.submitDeadlineDay} hằng tháng</p>
              </div>
              {availabilitySubmission.rejectionReason && <p className="mt-4 rounded-xl bg-danger/8 p-3 text-sm text-danger">{availabilitySubmission.rejectionReason}</p>}
              <ButtonLink to="/coach/availability" variant="secondary" className="mt-5 w-full justify-center">Mở thời khóa biểu</ButtonLink>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeading
            title="Học viên cần theo dõi"
            description="Ưu tiên học viên chưa có đánh giá hoặc đã đến ngày đánh giá tiếp theo."
            actions={<Link to="/coach/members" className="text-sm font-bold text-primary hover:text-primary-deep">Tất cả học viên</Link>}
          />
          {members.isPending ? (
            <ListSkeleton rows={3} label="Đang tải học viên…" />
          ) : members.isError ? (
            <ErrorState compact error={members.error} onRetry={() => members.refetch()} retrying={members.isRefetching} pendingApi="GET /api/coaches/me/members" />
          ) : dueMembers.length === 0 ? (
            <EmptyState compact icon={<CheckCircle />} title="Không có học viên quá hạn đánh giá" description="Các học viên đang được theo dõi đúng kế hoạch." />
          ) : (
            <ul className="divide-y divide-line">
              {dueMembers.map((member) => (
                <li key={member.id} className="flex items-center gap-3 py-3.5 first:pt-1">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-extrabold text-primary-deep">{member.displayName.trim().slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/coach/members/${member.id}`} className="truncate font-bold text-ink hover:text-primary">{member.displayName}</Link>
                    <p className="mt-0.5 truncate text-xs text-muted">{member.goals.latestAssessment?.nextAssessmentDate ? `Đến hạn ${formatDate(member.goals.latestAssessment.nextAssessmentDate)}` : 'Chưa có đánh giá tiến độ'}</p>
                  </div>
                  <ButtonLink to={`/coach/assessments/new?memberId=${member.id}`} size="sm" variant="secondary">Đánh giá</ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeading
            title="Đánh giá gần đây"
            description="Năm đánh giá mới nhất bạn đã ghi."
            actions={<Link to="/coach/assessments" className="text-sm font-bold text-primary hover:text-primary-deep">Xem lịch sử</Link>}
          />
          {assessments.isPending ? (
            <ListSkeleton rows={3} label="Đang tải đánh giá…" />
          ) : assessments.isError ? (
            <ErrorState compact error={assessments.error} onRetry={() => assessments.refetch()} retrying={assessments.isRefetching} />
          ) : assessmentItems.length === 0 ? (
            <EmptyState compact icon={<ChartLineUp />} title="Chưa có đánh giá" description="Hoàn tất buổi học và ghi đánh giá đầu tiên cho học viên." />
          ) : (
            <ul className="divide-y divide-line">
              {assessmentItems.map((assessment) => (
                <li key={assessment.id} className="flex items-center gap-3 py-3.5 first:pt-1">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-sky/15 font-extrabold text-primary-deep">{assessment.score ?? '—'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{assessment.member.displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{formatDate(assessment.assessmentDate)} · {assessment.context?.type === 'PRIVATE_COURSE' ? 'Khóa 1–1' : 'Lớp nhóm'}</p>
                  </div>
                  <Link to={`/coach/assessments?memberId=${assessment.member.id}`} className="grid size-9 shrink-0 place-items-center rounded-control text-primary hover:bg-primary/8" aria-label={`Xem đánh giá của ${assessment.member.displayName}`}><ArrowRight /></Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
