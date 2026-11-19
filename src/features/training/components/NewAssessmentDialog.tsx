import { useSearchParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { AssessmentForm } from './AssessmentForm';
import { Dialog } from '../../../components/ui/Dialog';
import { ErrorState, ListSkeleton } from '../../../components/ui/States';
import { useCoachMembers } from '../hooks/usePendingApis';

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
      description="Chỉ đánh giá được học viên thuộc lớp nhóm hoặc khóa 1-1 bạn đang phụ trách."
    >
      <NewAssessmentBody onClose={onClose} />
    </Dialog>
  );
}

// Tách riêng để danh sách học viên chỉ tải khi dialog mở
function NewAssessmentBody({ onClose }: { onClose: () => void }) {
  const members = useCoachMembers();
  // Link "Đánh giá sau buổi học" ở màn điểm danh truyền sẵn học viên và buổi học
  const [params] = useSearchParams();
  const initialMemberId = Number(params.get('memberId')) || undefined;
  const classSessionId = Number(params.get('classSessionId')) || undefined;
  const privateAttendanceId = Number(params.get('privateCourseAttendanceId')) || undefined;
  const initialSession = classSessionId
    ? ({ type: 'GROUP_CLASS', id: classSessionId } as const)
    : privateAttendanceId
      ? ({ type: 'PRIVATE_COURSE', id: privateAttendanceId } as const)
      : undefined;

  if (members.isPending) return <ListSkeleton rows={3} label="Đang tải danh sách học viên…" />;
  if (members.isError) {
    return (
      <ErrorState
        error={members.error}
        onRetry={() => members.refetch()}
        retrying={members.isRefetching}
        pendingApi="GET /api/coaches/me/members"
      />
    );
  }
  return (
    <AssessmentForm
      members={members.data}
      // Chỉ chọn sẵn học viên khi có buổi học truyền sang (link từ màn điểm danh); memberId đơn lẻ là bộ lọc danh sách
      initialMemberId={initialSession ? initialMemberId : undefined}
      initialSession={initialSession}
      onCancel={onClose}
      onCreated={(assessment) => {
        toast(`Đã lưu đánh giá cho ${assessment.member.displayName}.`);
        onClose();
      }}
    />
  );
}
