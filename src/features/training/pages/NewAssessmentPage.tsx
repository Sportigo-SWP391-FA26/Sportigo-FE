import { ArrowLeft } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { AssessmentForm } from '../components/AssessmentForm';
import { PageHeader } from '../components/ui/Card';
import { ErrorState, InlineAlert, ListSkeleton } from '../components/ui/States';
import { useCoachTrainees } from '../hooks/usePendingApis';

// FR-52 · /coach/assessments/new
export function NewAssessmentPage() {
  const navigate = useNavigate();
  const trainees = useCoachTrainees();

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <Link
        to="/coach/assessments"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-primary-deep hover:underline"
      >
        <ArrowLeft aria-hidden="true" /> Đánh giá tiến độ
      </Link>
      <PageHeader
        eyebrow="Đánh giá"
        title="Ghi đánh giá tiến độ"
        description="Chỉ đánh giá được học viên thuộc lớp nhóm hoặc khóa 1-1 bạn đang phụ trách. Không dùng ngôn ngữ chẩn đoán y khoa."
      />
      {trainees.isPending ? (
        <ListSkeleton rows={3} label="Đang tải danh sách học viên…" />
      ) : trainees.isError ? (
        <ErrorState
          error={trainees.error}
          onRetry={() => trainees.refetch()}
          retrying={trainees.isRefetching}
          pendingApi="GET /api/private-courses/enrollments"
        />
      ) : (
        <>
          <div className="mb-4">
            <InlineAlert tone="info">
              Hiện chỉ chọn được học viên khóa 1-1. Ngữ cảnh lớp nhóm sẽ có khi backend bổ sung API danh sách học viên lớp nhóm của Coach.
            </InlineAlert>
          </div>
          <AssessmentForm
            trainees={trainees.data}
            onCancel={() => navigate('/coach/assessments')}
            onCreated={(assessment) => {
              toast(`Đã lưu đánh giá cho ${assessment.member.displayName}.`);
              navigate('/coach/assessments');
            }}
          />
        </>
      )}
    </div>
  );
}
