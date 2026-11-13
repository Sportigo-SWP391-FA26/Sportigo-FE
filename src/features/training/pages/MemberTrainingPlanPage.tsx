import { CalendarBlank, ChalkboardTeacher, Clock, UserCircle } from '@phosphor-icons/react';
import { useId, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlanItemList } from '../components/PlanItemList';
import { NO_PLAN_MESSAGE } from '../components/TodayPlanWidget';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '../../../components/ui/States';
import { cardClass } from '../../../components/ui/styles';
import { formatDate } from '../format';
import { useMyTraining } from '../hooks/useMemberTraining';
import { assignmentStatusLabels, levelLabel } from '../labels';
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
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <PageHeader
        title="Kế hoạch tập luyện"
        description="Theo dõi nội dung Coach đã gán và tiến độ từng buổi học."
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
        <div className="space-y-5">
          {assignments.length > 1 && <nav aria-label="Giáo án của bạn" className="flex flex-wrap gap-4">
            <AssignmentGroup title="Đang áp dụng" assignments={assignments.filter((item) => item.status === 'ACTIVE')} selectedId={selected.id} />
            <AssignmentGroup title="Đã kết thúc" assignments={assignments.filter((item) => item.status !== 'ACTIVE')} selectedId={selected.id} />
          </nav>}
          <div className="min-w-0">
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
    <section aria-labelledby={headingId} className="min-w-0 flex-1">
      <h2 id={headingId} className="mb-2 text-[11px] font-extrabold tracking-[.08em] text-muted uppercase">
        {title} · {assignments.length}
      </h2>
      <ul className="flex flex-wrap gap-2.5">
        {assignments.map((assignment) => {
          const selected = assignment.id === selectedId;
          return (
            <li key={assignment.id} className="min-w-[220px] flex-1 sm:max-w-[300px]">
              <Link
                to={`?assignment=${assignment.id}`}
                aria-current={selected ? 'true' : undefined}
                className={`block h-full rounded-2xl border p-3 transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
                <p className="mt-2 text-xs text-muted">Coach {assignment.enrollment.coach.displayName} · {formatDate(assignment.assignedAt)}</p>
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
  const [selectedWeek, setSelectedWeek] = useState(() => initialWeek ?? progress?.week ?? weekNumbers[0] ?? 1);
  const completionByItemId = new Map(assignment.completedItems.map((completion) => [completion.workoutPlanItemId, completion]));

  const week = weeks.get(selectedWeek);
  const isCurrentWeek = progress?.state === 'in-progress' && progress.week === selectedWeek;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="primary">{plan.sport.name}</Chip>
          <Chip>{levelLabel(plan.level)}</Chip>
          <Chip tone={assignment.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
            {assignmentStatusLabels[assignment.status]}
          </Chip>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-2xl leading-tight font-extrabold tracking-[-.02em] text-ink">{plan.name}</h2>{plan.description && <p className="mt-1 max-w-[75ch] text-sm leading-relaxed text-muted">{plan.description}</p>}</div>
          <div className="text-right"><span className="block text-xs text-muted">Đã hoàn thành</span><strong className="text-lg text-primary-deep">{assignment.progress.completedItems}/{assignment.progress.totalItems} mục</strong></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Tiến độ giáo án" aria-valuenow={assignment.progress.percentage} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${assignment.progress.percentage}%` }} /></div>
        <dl className="mt-4 grid gap-x-5 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
            value={`${plan.durationWeeks} tuần · từ ${formatDate(assignment.assignedAt)}`}
          />
        </dl>
      </Card>

      <nav aria-label="Chọn tuần" className="flex gap-2 overflow-x-auto pb-1">
        {weekNumbers.map((weekNumber) => {
          const isCurrent = progress?.state === 'in-progress' && progress.week === weekNumber;
          return (
            <button
              key={weekNumber}
              type="button"
              onClick={() => setSelectedWeek(weekNumber)}
              aria-current={selectedWeek === weekNumber ? 'true' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selectedWeek === weekNumber ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary/40'
              }`}
            >
              Tuần {weekNumber}
              {isCurrent && <span className="text-[11px] font-semibold opacity-90">· Tuần này</span>}
            </button>
          );
        })}
      </nav>

      <section className={`${cardClass} overflow-hidden`} aria-labelledby={`plan-${assignment.id}-week-heading`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
          <h3 id={`plan-${assignment.id}-week-heading`} className="font-extrabold text-ink">Tuần {selectedWeek}</h3>
          {isCurrentWeek && <Chip tone="primary">Tuần này</Chip>}
          <span className="ml-auto text-xs text-muted">{week ? `${week.sessions.length} buổi · ${week.itemCount} mục` : 'Chưa có nội dung'}</span>
        </div>
        <div className="p-4 sm:p-5">
          {week ? (
            <div className="space-y-5">
              {week.sessions.map((session) => (
                <div key={session.sessionNumber}>
                  <h4 className="mb-3 text-[11px] font-extrabold tracking-[.08em] text-primary-deep uppercase">Buổi {session.sessionNumber}</h4>
                  <PlanItemList items={session.items} completionByItemId={completionByItemId} />
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted">Coach chưa thêm nội dung cho tuần này.</p>}
        </div>
      </section>
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
