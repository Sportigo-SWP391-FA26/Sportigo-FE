import { ArrowRight, Barbell } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../format';
import { useMyTraining } from '../hooks/useMemberTraining';
import { levelLabel } from '../labels';
import { currentPlanWeek, groupPlanItems } from '../planStructure';
import type { MemberPlanAssignment } from '../types';
import { PlanItemList } from './PlanItemList';
import { Card, Eyebrow } from './ui/Card';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from './ui/States';
import { Tabs } from './ui/Tabs';

const MAX_VISIBLE_ITEMS = 4;

export const NO_PLAN_MESSAGE = 'Bạn chưa được gán giáo án. Hãy liên hệ Coach phụ trách khóa 1-1.';

/**
 * FR-53 · Widget "Giáo án hôm nay" để gắn vào Dashboard Member.
 * Tự gọi GET /api/members/me/training, không cần truyền props.
 */
export function TodayPlanWidget() {
  const headingId = useId();
  const { data, error, isPending, refetch, isRefetching } = useMyTraining();
  const activeAssignments = data?.planAssignments.filter((assignment) => assignment.status === 'ACTIVE') ?? [];
  const assignment = activeAssignments[0];

  return (
    <Card className="p-5 sm:p-6" aria-labelledby={headingId}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Eyebrow>
          <Barbell weight="bold" aria-hidden="true" />
          <span id={headingId}>Giáo án hôm nay</span>
        </Eyebrow>
        {assignment && (
          <Link
            to={`/member/training-plan?assignment=${assignment.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[13px] font-bold whitespace-nowrap text-primary-deep hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-primary"
          >
            Xem toàn bộ <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>

      {isPending ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Đang tải giáo án…</span>
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <ErrorState compact error={error} onRetry={() => refetch()} retrying={isRefetching} />
      ) : !assignment ? (
        <EmptyState compact title="Chưa có giáo án" description={NO_PLAN_MESSAGE} />
      ) : (
        <TodayPlanContent key={assignment.id} assignment={assignment} otherActiveCount={activeAssignments.length - 1} />
      )}
    </Card>
  );
}

function TodayPlanContent({ assignment, otherActiveCount }: { assignment: MemberPlanAssignment; otherActiveCount: number }) {
  const { workoutPlan: plan, enrollment } = assignment;
  const progress = currentPlanWeek(enrollment.startDate, plan.durationWeeks);
  const weekNumber = progress?.week ?? 1;
  const week = groupPlanItems(plan.items).find((entry) => entry.weekNumber === weekNumber);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const session = week?.sessions.find((entry) => entry.sessionNumber === selectedSession) ?? week?.sessions[0];
  const visibleItems = session?.items.slice(0, MAX_VISIBLE_ITEMS) ?? [];
  const hiddenCount = (session?.items.length ?? 0) - visibleItems.length;
  const detailLink = `/member/training-plan?assignment=${assignment.id}&week=${weekNumber}`;

  return (
    <div>
      <h3 className="text-xl leading-snug font-extrabold tracking-[-.02em] text-ink">{plan.name}</h3>
      <p className="mt-1 text-[13px] text-muted">
        {plan.sport.name} · {levelLabel(plan.level)} · Coach {enrollment.coach.displayName}
      </p>

      {progress && plan.durationWeeks && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-bold text-ink">
              Tuần {weekNumber} / {plan.durationWeeks}
            </span>
            <span className="text-xs text-muted">Theo ngày bắt đầu khóa</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`Tuần ${weekNumber} trên ${plan.durationWeeks}`}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(weekNumber / plan.durationWeeks) * 100}%` }} />
          </div>
        </div>
      )}

      {progress?.state === 'upcoming' && enrollment.startDate && (
        <div className="mt-4">
          <InlineAlert tone="info">Chương trình bắt đầu từ {formatDate(enrollment.startDate)}. Bạn có thể xem trước nội dung Tuần 1.</InlineAlert>
        </div>
      )}
      {progress?.state === 'finished' && (
        <div className="mt-4">
          <InlineAlert tone="info">Bạn đã đi hết {plan.durationWeeks} tuần của giáo án. Đây là nội dung tuần cuối.</InlineAlert>
        </div>
      )}

      {!week || !session ? (
        <EmptyState compact title={`Tuần ${weekNumber} chưa có nội dung`} description="Coach chưa thêm mục tập cho tuần này trong giáo án." />
      ) : (
        <div className="mt-5">
          {week.sessions.length > 1 && (
            <div className="mb-4">
              <Tabs
                label={`Các buổi trong tuần ${weekNumber}`}
                idPrefix={`today-plan-${assignment.id}`}
                tabs={week.sessions.map((entry) => ({ value: String(entry.sessionNumber), label: `Buổi ${entry.sessionNumber}` }))}
                value={String(session.sessionNumber)}
                onChange={(value) => setSelectedSession(Number(value))}
              />
            </div>
          )}
          <div
            role={week.sessions.length > 1 ? 'tabpanel' : undefined}
            id={`today-plan-${assignment.id}-panel-${session.sessionNumber}`}
            aria-labelledby={week.sessions.length > 1 ? `today-plan-${assignment.id}-tab-${session.sessionNumber}` : undefined}
          >
            <PlanItemList items={visibleItems} compact />
          </div>
          {hiddenCount > 0 && (
            <Link to={detailLink} className="mt-3 inline-flex min-h-11 items-center text-[13px] font-bold text-primary-deep hover:underline">
              +{hiddenCount} mục khác trong buổi này
            </Link>
          )}
        </div>
      )}

      {otherActiveCount > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Bạn còn {otherActiveCount} giáo án khác đang áp dụng.{' '}
          <Link to="/member/training-plan" className="font-bold text-primary-deep hover:underline">
            Xem tất cả
          </Link>
        </p>
      )}
    </div>
  );
}
