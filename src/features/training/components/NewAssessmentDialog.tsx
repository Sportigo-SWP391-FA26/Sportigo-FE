import { toast } from '../../../components/feedback/toast';
import { AssessmentForm } from './AssessmentForm';
import { Dialog } from '../../../components/ui/Dialog';
import { ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { useCoachTrainees } from '../hooks/usePendingApis';

type Props = {
  open: boolean;
  onClose: () => void;
};

// FR-52 · Dialog ghi đánh giá, mở từ /coach/assessments hoặc trực tiếp qua /coach/assessments/new
export function NewAssessmentDialog({ open, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Ghi đánh giá tiến độ"
      description="Chỉ đánh giá được học viên thuộc lớp nhóm hoặc khóa 1-1 bạn đang phụ trách. Không dùng ngôn ngữ chẩn đoán y khoa."
    >
      <NewAssessmentBody onClose={onClose} />
    </Dialog>
  );
}

// Tách riêng để danh sách học viên chỉ tải khi dialog mở
function NewAssessmentBody({ onClose }: { onClose: () => void }) {
  const trainees = useCoachTrainees();

  if (trainees.isPending) return <ListSkeleton rows={3} label="Đang tải danh sách học viên…" />;
  if (trainees.isError) {
    return (
      <ErrorState
        error={trainees.error}
        onRetry={() => trainees.refetch()}
        retrying={trainees.isRefetching}
        pendingApi="GET /api/private-courses/enrollments"
      />
    );
  }
  return (
    <>
      <div className="mb-4">
        <InlineAlert tone="info">
          Hiện chỉ chọn được học viên khóa 1-1. Ngữ cảnh lớp nhóm sẽ có khi backend bổ sung API danh sách học viên lớp nhóm của Coach.
        </InlineAlert>
      </div>
      <AssessmentForm
        trainees={trainees.data}
        onCancel={onClose}
        onCreated={(assessment) => {
          toast(`Đã lưu đánh giá cho ${assessment.member.displayName}.`);
          onClose();
        }}
      />
    </>
  );
}
