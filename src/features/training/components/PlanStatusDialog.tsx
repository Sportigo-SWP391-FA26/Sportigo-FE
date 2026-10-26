import { useState } from 'react';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../errors';
import { useChangePlanStatus } from '../hooks/useWorkoutPlans';
import { nextStatuses, planStatusLabels } from '../labels';
import type { EditablePlanStatus, WorkoutPlan } from '../types';
import { ConfirmDialog } from './ui/Dialog';
import { SegmentedControl } from './ui/Field';
import { InlineAlert } from './ui/States';

const consequences: Record<EditablePlanStatus, string> = {
  ACTIVE: 'Giáo án có thể được gán cho khóa 1-1 cùng môn. Cần ít nhất một mục.',
  DRAFT: 'Giáo án tạm ẩn khỏi danh sách gán. Các khóa 1-1 đã được gán vẫn giữ nguyên.',
  INACTIVE: 'Ngừng sử dụng, không xóa dữ liệu. Không thể gán mới; các khóa 1-1 đã được gán vẫn giữ nguyên.',
};

const actionLabels: Record<EditablePlanStatus, string> = {
  ACTIVE: 'Kích hoạt',
  DRAFT: 'Chuyển về nháp',
  INACTIVE: 'Ngừng sử dụng',
};

type Props = {
  plan: WorkoutPlan | null;
  onClose: () => void;
};

// FR-49: đổi trạng thái có xác nhận; không có xóa cứng, "xóa" là Ngừng sử dụng
export function PlanStatusDialog({ plan, onClose }: Props) {
  return plan ? <StatusForm key={plan.id} plan={plan} onClose={onClose} /> : null;
}

function StatusForm({ plan, onClose }: { plan: WorkoutPlan; onClose: () => void }) {
  const options = nextStatuses(plan.status);
  const [target, setTarget] = useState<EditablePlanStatus>(options[0]);
  const [error, setError] = useState<string | null>(null);
  const change = useChangePlanStatus();
  const needsItems = target === 'ACTIVE' && plan.itemCount === 0;

  const confirm = () => {
    if (needsItems) return;
    setError(null);
    change.mutate(
      { planId: plan.id, status: target },
      {
        onSuccess: () => {
          toast(`Đã chuyển "${plan.name}" sang ${planStatusLabels[target]}.`);
          onClose();
        },
        onError: (mutationError) => setError(parseApiError(mutationError).message),
      },
    );
  };

  return (
    <ConfirmDialog
      open
      title="Đổi trạng thái giáo án"
      confirmLabel={actionLabels[target]}
      tone={target === 'INACTIVE' ? 'danger' : 'primary'}
      loading={change.isPending}
      confirmDisabled={needsItems}
      onConfirm={confirm}
      onCancel={onClose}
      description={
        <>
          <p>
            <b>{plan.name}</b> đang ở trạng thái <b>{planStatusLabels[plan.status]}</b>.
          </p>
          <SegmentedControl
            name={`plan-status-${plan.id}`}
            legend="Chuyển sang"
            options={options.map((value) => ({ value, label: planStatusLabels[value] }))}
            value={target}
            onChange={setTarget}
          />
          <p className="text-muted">{consequences[target]}</p>
        </>
      }
      error={
        needsItems ? (
          <InlineAlert tone="warning">Giáo án chưa có mục nào. Hãy thêm ít nhất một mục trước khi kích hoạt.</InlineAlert>
        ) : error ? (
          <InlineAlert>{error}</InlineAlert>
        ) : undefined
      }
    />
  );
}
