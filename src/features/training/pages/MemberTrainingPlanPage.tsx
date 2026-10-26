import { ArrowLeft, CalendarBlank, CaretDown, ChalkboardTeacher, Clock, UserCircle } from '@phosphor-icons/react';
import { useId, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlanItemList } from '../components/PlanItemList';
import { NO_PLAN_MESSAGE } from '../components/TodayPlanWidget';
import { Card, PageHeader } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '../components/ui/States';
import { cardClass } from '../components/ui/styles';
import { formatDate } from '../format';
import { useMyTraining } from '../hooks/useMemberTraining';
import { assignmentStatusLabels, levelLabel } from '../labels';
import { isDesktopViewport, scrollToElement } from '../motion';
import { currentPlanWeek, groupPlanItems, planWeekNumbers } from '../planStructure';
import type { MemberPlanAssignment } from '../types';

// FR-53 · /member/training-plan: Member xem giáo án được gán (chỉ đọc)
export function MemberTrainingPlanPage() {
  const { data, error, isPending, refetch, isRefetching } = useMyTraining();
  const [params] = useSearchParams();
  const assignments = data?.planAssignments ?? [];
  const requestedId = Number(params.get('assignment'));
  const requested = assignments.find((assignment) => assignment.id === requestedId);
  const selected = requested ?? assignments[0];
  const requestedWeek = Number(params.get('week')) || undefined;

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Tập luyện"
        title="Kế hoạch tập luyện"
        description="Giáo án do Coach phụ trách khóa 1-1 gán cho bạn. Nội dung chỉ để xem; hãy trao đổi với Coach nếu cần điều chỉnh."
      />

      {isPending ? (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ListSkeleton rows={3} label="Đang tải giáo án…" />
          <div className={`${cardClass} hidden space-y-3 p-6 lg:block`} aria-hidden="true">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
      ) : !selected ? (
        <EmptyState title="Chưa có giáo án" description={NO_PLAN_MESSAGE} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          {/* Mobile: đang xem chi tiết thì ẩn danh sách; desktop luôn hiện cả hai */}
          <nav aria-label="Giáo án của bạn" className={requested ? 'hidden lg:block' : ''}>
            <AssignmentGroup title="Đang áp dụng" assignments={assignments.filter((item) => item.status === 'ACTIVE')} selectedId={selected.id} />
            <AssignmentGroup title="Đã kết thúc" assignments={assignments.filter((item) => item.status !== 'ACTIVE')} selectedId={selected.id} />
          </nav>
          <div className={requested ? 'min-w-0' : 'hidden min-w-0 lg:block'}>
            {requested && (
              <Link
                to="/member/training-plan"
                className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-primary-deep hover:underline lg:hidden"
              >
                <ArrowLeft aria-hidden="true" /> Tất cả giáo án
              </Link>
            )}
            <AssignmentDetail key={selected.id} assignment={selected} initialWeek={requestedWeek} />
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentGroup({ title, assignments, selectedId }: { title: string; assignments: MemberPlanAssignment[]; selectedId: number }) {
  const headingId = useId();
  if (assignments.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="mb-5 last:mb-0">
      <h2 id={headingId} className="mb-2 text-[11px] font-extrabold tracking-[.08em] text-muted uppercase">
        {title} · {assignments.length}
      </h2>
      <ul className="space-y-2.5">
        {assignments.map((assignment) => {
          const selected = assignment.id === selectedId;
          return (
            <li key={assignment.id}>
              <Link
                to={`?assignment=${assignment.id}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => {
                  if (!isDesktopViewport()) window.scrollTo({ top: 0 });
                }}
                className={`block rounded-2xl border p-4 transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected ? 'border-primary bg-surface shadow-raised' : 'border-line bg-surface hover:border-primary/40'
                }`}
              >
                <p className="font-bold text-ink">{assignment.workoutPlan.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip tone="primary">{assignment.workoutPlan.sport.name}</Chip>
                  <Chip>{levelLabel(assignment.workoutPlan.level)}</Chip>
                  <Chip tone={assignment.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                    {assignmentStatusLabels[assignment.status]}
                  </Chip>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted">
                  Coach {assignment.enrollment.coach.displayName} · {assignment.enrollment.course.name}
                  <br />
                  Gán ngày {formatDate(assignment.assignedAt)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AssignmentDetail({ assignment, initialWeek }: { assignment: MemberPlanAssignment; initialWeek?: number }) {
  const { workoutPlan: plan, enrollment } = assignment;
  const progress = assignment.status === 'ACTIVE' ? currentPlanWeek(enrollment.startDate, plan.durationWeeks) : null;
  const weekNumbers = planWeekNumbers(plan.durationWeeks, plan.items);
  const weeks = new Map(groupPlanItems(plan.items).map((week) => [week.weekNumber, week]));
  const [openWeeks, setOpenWeeks] = useState(() => new Set([initialWeek ?? progress?.week ?? 1]));
  const idPrefix = `plan-${assignment.id}`;

  const toggleWeek = (weekNumber: number) =>
    setOpenWeeks((current) => {
      const next = new Set(current);
      if (next.has(weekNumber)) next.delete(weekNumber);
      else next.add(weekNumber);
      return next;
    });

  const jumpToWeek = (weekNumber: number) => {
    setOpenWeeks((current) => new Set(current).add(weekNumber));
    requestAnimationFrame(() => {
      const heading = document.getElementById(`${idPrefix}-week-${weekNumber}`);
      scrollToElement(heading);
      heading?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="primary">{plan.sport.name}</Chip>
          <Chip>{levelLabel(plan.level)}</Chip>
          <Chip tone={assignment.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
            {assignmentStatusLabels[assignment.status]}
          </Chip>
        </div>
        <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-[-.02em] text-ink">{plan.name}</h2>
        {plan.description && <p className="mt-2 text-sm leading-relaxed text-muted">{plan.description}</p>}
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <Meta icon={<ChalkboardTeacher />} label="Coach phụ trách" value={enrollment.coach.displayName} />
          <Meta icon={<UserCircle />} label="Khóa 1-1" value={enrollment.course.name} />
          <Meta
            icon={<CalendarBlank />}
            label="Thời hạn khóa"
            value={enrollment.startDate && enrollment.expiryDate ? `${formatDate(enrollment.startDate)} – ${formatDate(enrollment.expiryDate)}` : 'Chưa có'}
          />
          <Meta
            icon={<Clock />}
            label="Thời lượng giáo án"
            value={`${plan.durationWeeks ? `${plan.durationWeeks} tuần · ` : ''}gán ngày ${formatDate(assignment.assignedAt)} bởi ${assignment.assignedBy.displayName}`}
          />
        </dl>
      </Card>

      <nav aria-label="Chọn tuần" className="flex flex-wrap gap-2">
        {weekNumbers.map((weekNumber) => {
          const isCurrent = progress?.state === 'in-progress' && progress.week === weekNumber;
          return (
            <button
              key={weekNumber}
              type="button"
              onClick={() => jumpToWeek(weekNumber)}
              aria-controls={`${idPrefix}-week-panel-${weekNumber}`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isCurrent ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary/40'
              }`}
            >
              Tuần {weekNumber}
              {isCurrent && <span className="text-[11px] font-semibold opacity-90">· Tuần này</span>}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3">
        {weekNumbers.map((weekNumber) => {
          const week = weeks.get(weekNumber);
          const open = openWeeks.has(weekNumber);
          const isCurrent = progress?.state === 'in-progress' && progress.week === weekNumber;
          return (
            <section key={weekNumber} className={`${cardClass} overflow-hidden ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}>
              <h3 id={`${idPrefix}-week-${weekNumber}`} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
                <button
                  type="button"
                  onClick={() => toggleWeek(weekNumber)}
                  aria-expanded={open}
                  aria-controls={`${idPrefix}-week-panel-${weekNumber}`}
                  className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="text-base font-extrabold text-ink">Tuần {weekNumber}</span>
                  {isCurrent && <Chip tone="primary">Tuần này</Chip>}
                  <span className="ml-auto text-xs whitespace-nowrap text-muted">
                    {week ? `${week.sessions.length} buổi · ${week.itemCount} mục` : 'Chưa có nội dung'}
                  </span>
                  <CaretDown className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </h3>
              <div id={`${idPrefix}-week-panel-${weekNumber}`} hidden={!open} className="border-t border-line px-5 py-4">
                {week ? (
                  <div className="space-y-5">
                    {week.sessions.map((session) => (
                      <div key={session.sessionNumber}>
                        <h4 className="mb-3 text-[11px] font-extrabold tracking-[.08em] text-primary-deep uppercase">
                          Buổi {session.sessionNumber}
                        </h4>
                        <PlanItemList items={session.items} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Coach chưa thêm nội dung cho tuần này.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-lg text-primary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="mt-0.5 font-bold text-ink">{value}</dd>
      </div>
    </div>
  );
}
