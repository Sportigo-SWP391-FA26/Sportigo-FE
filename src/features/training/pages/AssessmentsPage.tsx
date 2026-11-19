import { ChartLineUp, Funnel, Plus } from '@phosphor-icons/react';
import { useId } from 'react';
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { AssessmentCard } from '../components/AssessmentCard';
import { NewAssessmentDialog } from '../components/NewAssessmentDialog';
import { SelectInput } from '../components/SelectInput';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Pagination } from '../../../components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { useAssessments } from '../hooks/useAssessments';
import { useCoachMembers } from '../hooks/usePendingApis';
import { traineeLabel } from '../labels';

const PAGE_SIZE = 10;
const PREFILL_KEYS = ['classSessionId', 'privateCourseAttendanceId', 'classRegistrationId', 'sessionDate'];

function withoutPrefill(search: string) {
  const params = new URLSearchParams(search);
  for (const key of PREFILL_KEYS) params.delete(key);
  const value = params.toString();
  return value ? `?${value}` : '';
}

// FR-52 · /coach/assessments: đánh giá do chính Coach ghi, mới nhất trước.
// /coach/assessments/new hiển thị cùng trang với dialog Ghi đánh giá đang mở (giữ được link cũ và nút Back).
export function AssessmentsPage() {
  const filterId = useId();
  const [params, setParams] = useSearchParams();
  const members = useCoachMembers();
  const navigate = useNavigate();
  const { search } = useLocation();
  // Tham số chọn sẵn chỉ dành cho link "Đánh giá sau buổi học" ở màn điểm danh;
  // nút "Ghi đánh giá" và đóng dialog chỉ giữ bộ lọc danh sách (memberId, page)
  const listSearch = withoutPrefill(search);
  const creating = useMatch('/coach/assessments/new') !== null;
  const newAssessmentPath = `/coach/assessments/new${listSearch}`;
  const memberId = Number(params.get('memberId')) || undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const assessments = useAssessments({ page, pageSize: PAGE_SIZE, memberId });
  const items = assessments.data?.items ?? [];
  const memberName = items.find((item) => item.member.id === memberId)?.member.displayName;
  // Học viên Coach phụ trách (có tên); học viên đang lọc mà không có trong danh sách thì vẫn thêm vào để ô chọn hiển thị đúng
  const memberOptions = (members.data ?? []).map((member) => ({ id: member.id, label: traineeLabel(member) }));
  if (memberId && !memberOptions.some((option) => option.id === memberId)) {
    memberOptions.unshift({ id: memberId, label: memberName ?? `Học viên #${memberId}` });
  }

  const setFilter = (next: { memberId?: number; page?: number }) => {
    const search = new URLSearchParams();
    if (next.memberId) search.set('memberId', String(next.memberId));
    if (next.page && next.page > 1) search.set('page', String(next.page));
    setParams(search, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Đánh giá"
        title="Đánh giá tiến độ"
        description="Các đánh giá bạn đã ghi cho học viên lớp nhóm và khóa 1-1, mới nhất trước."
        actions={
          <ButtonLink to={newAssessmentPath} variant="primary" icon={<Plus weight="bold" aria-hidden="true" />}>
            Ghi đánh giá
          </ButtonLink>
        }
      />

      <NewAssessmentDialog open={creating} onClose={() => navigate({ pathname: '/coach/assessments', search: listSearch })} />

      {/* Thẻ lọc phủ toàn chiều ngang: nhãn bên trái, ô chọn học viên bên phải */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4">
        <label htmlFor={filterId} className="inline-flex items-center gap-2 text-sm font-bold text-ink">
          <Funnel className="text-muted" aria-hidden="true" /> Lọc theo học viên
        </label>
        <div className="w-full sm:w-80">
          <SelectInput
            id={filterId}
            value={memberId ?? ''}
            disabled={members.isPending && !memberId}
            onChange={(event) => setFilter({ memberId: Number(event.target.value) || undefined })}
          >
            <option value="">{members.isPending ? 'Đang tải học viên…' : 'Tất cả học viên'}</option>
            {memberOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </Card>

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
              <ButtonLink to={newAssessmentPath} variant="primary">
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
