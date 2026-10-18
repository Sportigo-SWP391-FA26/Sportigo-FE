import { ArrowLeft, ClipboardText, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AssignPlanDialog } from '../components/AssignPlanDialogs';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../components/ui/States';
import { parseApiError } from '../errors';
import { formatDateTime } from '../format';
import { useCoachTrainees } from '../hooks/usePendingApis';
import { useEnrollmentPlans } from '../hooks/usePlanAssignments';
import { assignmentStatusLabels, enrollmentStatusLabels, levelLabel, planStatusLabels } from '../labels';
import type { SportRef, TraineeContext } from '../types';

// FR-51 · /coach/private-enrollments/:enrollmentId/plans
// Có thể gộp vào trang chi tiết khóa 1-1 (FR-36) khi module đó hoàn thiện.
export function EnrollmentPlansPage() {
  const enrollmentId = Number(useParams().enrollmentId);
  const assignments = useEnrollmentPlans(enrollmentId);
  const trainees = useCoachTrainees();
  const [assignOpen, setAssignOpen] = useState(false);

  // Thông tin khóa 1-1 lấy từ BE-3 (chưa có); môn dự phòng lấy từ giáo án đã gán (backend bảo đảm cùng môn)
  const trainee = trainees.data?.find((entry) =>
    entry.contexts.some((context) => context.type === 'PRIVATE_COURSE' && context.privateEnrollmentId === enrollmentId),
  );
  const context = trainee?.contexts.find(
    (entry): entry is Extract<TraineeContext, { type: 'PRIVATE_COURSE' }> =>
      entry.type === 'PRIVATE_COURSE' && entry.privateEnrollmentId === enrollmentId,
  );
  const sport: SportRef | null = context?.sport ?? assignments.data?.[0]?.workoutPlan.sport ?? null;
  const summaryPending = trainees.isError && parseApiError(trainees.error).kind === 'not-ready';

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <Link
        to="/coach/workout-plans"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-primary-deep hover:underline"
      >
        <ArrowLeft aria-hidden="true" /> Giáo án
      </Link>
      <PageHeader
        eyebrow="Khóa 1-1"
        title={context ? context.name : `Khóa 1-1 #${enrollmentId}`}
        description={
          trainee ? (
            <>
              Học viên <b className="text-ink">{trainee.member.displayName}</b> ({trainee.member.memberCode})
              {sport && ` · môn ${sport.name}`}
            </>
          ) : sport ? (
            `Môn ${sport.name}`
          ) : undefined
        }
        actions={
          <Button icon={<Plus weight="bold" aria-hidden="true" />} onClick={() => setAssignOpen(true)} disabled={!assignments.isSuccess}>
            Gán giáo án
          </Button>
        }
      />

      {summaryPending && (
        <div className="mb-4">
          <InlineAlert tone="info">
            Tên khóa, học viên và trạng thái khóa chưa hiển thị được vì backend chưa có API GET /api/coaches/me/trainees.
          </InlineAlert>
        </div>
      )}
      {context && context.status !== 'ACTIVE' && (
        <div className="mb-4">
          <InlineAlert tone="warning">Khóa 1-1 đang ở trạng thái {enrollmentStatusLabels[context.status]} nên chưa thể gán giáo án.</InlineAlert>
        </div>
      )}

      {assignments.isPending ? (
        <ListSkeleton rows={2} label="Đang tải giáo án đã gán…" />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} retrying={assignments.isRefetching} />
      ) : assignments.data.length === 0 ? (
        <EmptyState
          icon={<ClipboardText />}
          title="Khóa này chưa có giáo án"
          description="Gán một giáo án Đang dùng cùng môn để học viên theo dõi chương trình tập."
          action={
            <Button icon={<Plus weight="bold" aria-hidden="true" />} onClick={() => setAssignOpen(true)}>
              Gán giáo án
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {assignments.data.map((assignment) => (
            <li key={assignment.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/coach/workout-plans/${assignment.workoutPlan.id}`} className="font-bold text-primary-deep hover:underline">
                      {assignment.workoutPlan.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      Gán lúc {formatDateTime(assignment.assignedAt)} bởi {assignment.assignedBy.displayName}
                    </p>
                  </div>
                  <Chip tone={assignment.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                    {assignmentStatusLabels[assignment.status]}
                  </Chip>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone="primary">{assignment.workoutPlan.sport.name}</Chip>
                  <Chip>{levelLabel(assignment.workoutPlan.level)}</Chip>
                  {assignment.workoutPlan.durationWeeks && <Chip>{assignment.workoutPlan.durationWeeks} tuần</Chip>}
                  <Chip>Giáo án: {planStatusLabels[assignment.workoutPlan.status]}</Chip>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AssignPlanDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        enrollmentId={enrollmentId}
        sport={sport}
        assignments={assignments.data ?? []}
      />
    </div>
  );
}
