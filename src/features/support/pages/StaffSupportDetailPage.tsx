import { ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { toast } from '../../../components/feedback/toast';
import { useMyProfile } from '../../profile/hooks/useMyProfile';
import { parseApiError } from '../../training/errors';
import { formatDateTime } from '../../training/format';
import { Button, ButtonLink } from '../../training/components/ui/Button';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { useUserList } from '../../users/hooks/useUsers';
import { MessageThread } from '../components/MessageThread';
import { useSendStaffMessage, useStaffSupportDetail, useUpdateSupportRequest } from '../hooks/useSupportStaff';
import { canAssign, categoryLabel, isFinished, priorityOption, staffTransitions, statusOption } from '../labels';
import type { UpdateSupportInput } from '../types';

const historyStatus = { ACTIVE: 'Đang phụ trách', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã chuyển' } as const;

// FR-56 · /app/support/:requestId: nhân viên nhận/giao việc, phản hồi và chuyển trạng thái
export function StaffSupportDetailPage() {
  const id = Number(useParams().requestId);
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const me = useMyProfile();
  const detail = useStaffSupportDetail(id);
  const update = useUpdateSupportRequest();
  const send = useSendStaffMessage();
  // note: chỉ Manager cần danh sách lễ tân để giao việc
  const receptionists = useUserList({ role: 'RECEPTIONIST', status: 'ACTIVE', page: 1, pageSize: 100 }, isManager);
  const [assignTo, setAssignTo] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const back = (
    <ButtonLink to="/app/support" variant="ghost" size="sm" icon={<ArrowLeft aria-hidden="true" />} className="mb-2">
      Hàng đợi
    </ButtonLink>
  );

  if (detail.isPending) return <ListSkeleton rows={3} label="Đang tải yêu cầu hỗ trợ…" />;
  if (detail.isError) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        {back}
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} retrying={detail.isRefetching} pendingApi="GET /api/support-requests/:id" />
      </div>
    );
  }

  const request = detail.data;
  const state = statusOption(request.status);
  const priority = priorityOption(request.priority);
  const myId = me.data?.id;
  const isAssignee = request.assignee !== null && request.assignee.id === myId;
  // note: cùng quy tắc với backend: người phụ trách hoặc Manager mới đổi trạng thái / trả lời công khai
  const canAct = isManager || isAssignee;
  const transitions = canAct ? (staffTransitions[request.status] ?? []) : [];

  const run = async (input: UpdateSupportInput, success: string) => {
    setActionError(null);
    try {
      await update.mutateAsync({ id: request.id, input });
      toast(success);
      return true;
    } catch (err) {
      setActionError(parseApiError(err).message);
      return false;
    }
  };

  const handleSend = async (content: string) => {
    setSendError(null);
    try {
      await send.mutateAsync({ id: request.id, content, isInternal });
      setIsInternal(false);
    } catch (err) {
      setSendError(parseApiError(err).message);
      throw err;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader back={back} eyebrow={`Yêu cầu #${request.id}`} title={request.subject} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={state.tone} dot>
                {state.label}
              </Chip>
              <Chip tone={priority.tone}>Ưu tiên: {priority.label}</Chip>
              <span className="text-xs text-muted">{categoryLabel(request.category)}</span>
            </div>
            <p className="mt-3 text-xs text-muted">
              {request.requester.displayName} · gửi lúc {formatDateTime(request.createdAt)}
            </p>
            <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-ink">{request.description}</p>
          </Card>

          <MessageThread
            messages={request.messages}
            // note: phía nhân viên: tin của trung tâm căn phải, tin của hội viên căn trái
            isMine={(message) => message.sender.role !== 'MEMBER'}
            onSend={isFinished(request.status) ? null : handleSend}
            sending={send.isPending}
            error={sendError}
            closedNote="Yêu cầu đã đóng hoặc đã bị hủy."
            extraControls={
              <label className="mr-auto flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" className="size-4 accent-primary" checked={isInternal} onChange={(event) => setIsInternal(event.target.checked)} />
                Ghi chú nội bộ (hội viên không thấy)
              </label>
            }
          />
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="text-base font-extrabold text-ink">Xử lý</h2>
            <p className="text-sm text-ink">
              Phụ trách: <strong>{request.assignee?.displayName ?? 'Chưa có'}</strong>
            </p>

            {canAssign(request.status) && !isManager && !isAssignee && request.assignee === null && (
              <Button className="w-full" loading={update.isPending} disabled={!myId} onClick={() => myId && run({ assigneeId: myId }, 'Đã nhận xử lý yêu cầu.')}>
                Nhận xử lý
              </Button>
            )}

            {canAssign(request.status) && isManager && (
              <div className="space-y-2">
                <label htmlFor="assign-to" className="block text-[13px] font-bold text-ink">
                  Giao cho lễ tân
                </label>
                <select id="assign-to" className={inputClass} value={assignTo} onChange={(event) => setAssignTo(event.target.value)}>
                  <option value="">Chọn lễ tân…</option>
                  {(receptionists.data?.items ?? [])
                    .filter((user) => user.id !== request.assignee?.id)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                </select>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={!assignTo}
                  loading={update.isPending}
                  onClick={() => run({ assigneeId: Number(assignTo) }, 'Đã giao việc.').then((ok) => ok && setAssignTo(''))}
                >
                  Giao việc
                </Button>
              </div>
            )}

            {transitions.map((transition) => (
              <Button
                key={transition.to}
                className="w-full"
                variant={transition.primary ? 'primary' : 'secondary'}
                loading={update.isPending}
                onClick={() => run({ status: transition.to }, `Đã cập nhật: ${statusOption(transition.to).label}.`)}
              >
                {transition.label}
              </Button>
            ))}

            {actionError && <InlineAlert>{actionError}</InlineAlert>}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-base font-extrabold text-ink">Lịch sử xử lý</h2>
            {request.history.length === 0 ? (
              <p className="text-sm text-muted">Chưa có ai nhận yêu cầu.</p>
            ) : (
              <ol className="space-y-3 text-sm" aria-label="Lịch sử xử lý">
                {request.history.map((item) => (
                  <li key={item.id} className="border-l-2 border-line pl-3">
                    <p className="font-bold text-ink">{item.assignedTo.displayName}</p>
                    <p className="text-xs text-muted">
                      {historyStatus[item.status]} · giao bởi {item.assignedBy.displayName} · {formatDateTime(item.assignedAt)}
                    </p>
                    {item.note && <p className="mt-1 text-xs text-ink">{item.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
