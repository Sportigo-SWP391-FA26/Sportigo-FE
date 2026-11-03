import { ArrowRight, Student } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { useCoachTrainees } from '../hooks/usePendingApis';
import { enrollmentStatusLabels, traineeName, type Tone } from '../labels';
import type { EnrollmentStatus, TraineeContext, TraineeMember } from '../types';

type EnrollmentRow = Extract<TraineeContext, { type: 'PRIVATE_COURSE' }> & { member: TraineeMember };

const statusTones: Record<EnrollmentStatus, Tone> = {
  PENDING_PAYMENT: 'warning',
  ACTIVE: 'success',
  COMPLETED: 'info',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
  REFUNDED: 'neutral',
};

// FR-51 · /coach/private-enrollments: lối vào trang gán giáo án của từng khóa 1-1 Coach phụ trách
export function PrivateEnrollmentsPage() {
  const trainees = useCoachTrainees();
  const rows: EnrollmentRow[] = (trainees.data ?? []).flatMap((trainee) =>
    trainee.contexts
      .filter((context): context is Extract<TraineeContext, { type: 'PRIVATE_COURSE' }> => context.type === 'PRIVATE_COURSE')
      .map((context) => ({ ...context, member: trainee.member })),
  );

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Khóa 1-1"
        title="Khóa 1-1 của tôi"
        description="Các khóa 1-1 bạn phụ trách. Chọn một khóa để xem và gán giáo án."
      />
      {trainees.isPending ? (
        <ListSkeleton rows={4} label="Đang tải khóa 1-1…" />
      ) : trainees.isError ? (
        <ErrorState
          error={trainees.error}
          onRetry={() => trainees.refetch()}
          retrying={trainees.isRefetching}
          pendingApi="GET /api/private-courses/enrollments"
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Student />} title="Chưa có khóa 1-1" description="Bạn chưa phụ trách khóa 1-1 nào." />
      ) : (
        <Card className="p-2 sm:p-3">
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.privateEnrollmentId}>
                <Link
                  to={`/coach/private-enrollments/${row.privateEnrollmentId}/plans`}
                  className="group flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{row.name}</p>
                    <p className="text-xs text-muted">
                      {traineeName(row.member)}
                      {row.member.displayName && ` · ${row.member.memberCode}`} · {row.sport.name}
                    </p>
                  </div>
                  <Chip tone={statusTones[row.status]} dot>
                    {enrollmentStatusLabels[row.status]}
                  </Chip>
                  <ArrowRight
                    className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
