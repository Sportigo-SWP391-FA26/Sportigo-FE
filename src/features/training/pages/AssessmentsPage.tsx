import { ChartLineUp, Funnel, Plus, X } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router-dom';
import { AssessmentCard } from '../components/AssessmentCard';
import { Button, ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/Card';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States';
import { useAssessments } from '../hooks/useAssessments';

const PAGE_SIZE = 10;

// FR-52 · /coach/assessments: đánh giá do chính Coach ghi, mới nhất trước
export function AssessmentsPage() {
  const [params, setParams] = useSearchParams();
  const memberId = Number(params.get('memberId')) || undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const assessments = useAssessments({ page, pageSize: PAGE_SIZE, memberId });
  const items = assessments.data?.items ?? [];
  const memberName = items.find((item) => item.member.id === memberId)?.member.displayName;

  const setFilter = (next: { memberId?: number; page?: number }) => {
    const search = new URLSearchParams();
    if (next.memberId) search.set('memberId', String(next.memberId));
    if (next.page && next.page > 1) search.set('page', String(next.page));
    setParams(search, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <PageHeader
        eyebrow="Đánh giá"
        title="Đánh giá tiến độ"
        description="Các đánh giá bạn đã ghi cho học viên lớp nhóm và khóa 1-1, mới nhất trước."
        actions={
          <ButtonLink to="/coach/assessments/new" variant="primary" icon={<Plus weight="bold" aria-hidden="true" />}>
            Ghi đánh giá
          </ButtonLink>
        }
      />

      {memberId ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary/10 pr-1 pl-3.5 text-[13px] font-bold text-primary-deep">
            Học viên: {memberName ?? `#${memberId}`}
            <button
              type="button"
              onClick={() => setFilter({})}
              aria-label="Bỏ lọc học viên"
              className="grid size-7 place-items-center rounded-full hover:bg-primary/15"
            >
              <X aria-hidden="true" />
            </button>
          </span>
        </p>
      ) : (
        <p className="mb-4 flex items-start gap-2 text-xs text-muted">
          <Funnel className="mt-0.5 shrink-0" aria-hidden="true" />
          Bấm "Chỉ xem …" dưới một thẻ để lọc theo học viên. Bộ chọn học viên chờ API GET /api/coaches/me/trainees.
        </p>
      )}

      {assessments.isPending ? (
        <ListSkeleton rows={3} label="Đang tải đánh giá…" />
      ) : assessments.isError ? (
        <ErrorState error={assessments.error} onRetry={() => assessments.refetch()} retrying={assessments.isRefetching} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ChartLineUp />}
          title={memberId ? 'Học viên này chưa có đánh giá' : 'Bạn chưa ghi đánh giá nào'}
          description="Ghi đánh giá định kỳ để học viên theo dõi tiến độ trên trang Kết quả & Tiến độ."
          action={
            memberId ? (
              <Button variant="secondary" onClick={() => setFilter({})}>
                Xem tất cả
              </Button>
            ) : (
              <ButtonLink to="/coach/assessments/new" variant="primary">
                Ghi đánh giá
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className={`transition-opacity ${assessments.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={assessments.isFetching}>
          <ol className="space-y-3">
            {items.map((assessment) => (
              <li key={assessment.id}>
                <AssessmentCard assessment={assessment} showMember />
                {!memberId && (
                  <Button size="sm" variant="ghost" className="mt-1" onClick={() => setFilter({ memberId: assessment.member.id })}>
                    Chỉ xem {assessment.member.displayName}
                  </Button>
                )}
              </li>
            ))}
          </ol>
          <Pagination
            page={assessments.data.page}
            pageSize={assessments.data.pageSize}
            total={assessments.data.total}
            disabled={assessments.isFetching}
            onChange={(next) => setFilter({ memberId, page: next })}
          />
        </div>
      )}
    </div>
  );
}
