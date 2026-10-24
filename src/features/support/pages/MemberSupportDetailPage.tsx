import { ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../../training/errors';
import { formatDateTime } from '../../training/format';
import { Button, ButtonLink } from '../../training/components/ui/Button';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { ConfirmDialog } from '../../training/components/ui/Dialog';
import { ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { MessageThread } from '../components/MessageThread';
import { useCancelSupportRequest, useSendSupportMessage, useSupportDetail } from '../hooks/useSupport';
import { categoryLabel, isFinished, memberCanCancel, priorityOption, statusOption } from '../labels';

// FR-55 · /member/support/:id: chi tiết yêu cầu, trao đổi và hủy
export function MemberSupportDetailPage() {
  const id = Number(useParams().requestId);
  const detail = useSupportDetail(id);
  const send = useSendSupportMessage();
  const cancel = useCancelSupportRequest();
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const back = (
    <ButtonLink to="/member/support" variant="ghost" size="sm" icon={<ArrowLeft aria-hidden="true" />} className="mb-2">
      Tất cả yêu cầu
    </ButtonLink>
  );

  if (detail.isPending) return <ListSkeleton rows={3} label="Đang tải yêu cầu hỗ trợ…" />;
  if (detail.isError) {
    return (
      <div className="mx-auto w-full max-w-[960px]">
        {back}
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} retrying={detail.isRefetching} pendingApi="GET /api/support-requests/:id" />
      </div>
    );
  }

  const request = detail.data;
  const state = statusOption(request.status);
  const priority = priorityOption(request.priority);
  const finished = isFinished(request.status);

  const handleSend = async (content: string) => {
    setSendError(null);
    try {
      await send.mutateAsync({ id: request.id, content });
    } catch (err) {
      setSendError(parseApiError(err).message);
      throw err;
    }
  };

  const handleCancel = async () => {
    setCancelError(null);
    try {
      await cancel.mutateAsync(request.id);
      setConfirmCancel(false);
      toast('Đã hủy yêu cầu hỗ trợ.');
    } catch (err) {
      setCancelError(parseApiError(err).message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <PageHeader
        back={back}
        eyebrow={`Yêu cầu #${request.id}`}
        title={request.subject}
        actions={
          memberCanCancel(request.status) && (
            <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
              Hủy yêu cầu
            </Button>
          )
        }
      />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={state.tone} dot>
            {state.label}
          </Chip>
          <Chip tone={priority.tone}>Ưu tiên: {priority.label}</Chip>
          <span className="text-xs text-muted">{categoryLabel(request.category)}</span>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-2">
          <div>
            <dt className="inline">Gửi lúc: </dt>
            <dd className="inline">{formatDateTime(request.createdAt)}</dd>
          </div>
          <div>
            <dt className="inline">Người phụ trách: </dt>
            <dd className="inline">{request.assignee?.displayName ?? 'Chưa phân công'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-ink">{request.description}</p>
      </Card>

      <MessageThread
        messages={request.messages}
        // note: Member là người tạo yêu cầu nên tin "của mình" là tin do requester gửi
        isMine={(message) => message.sender.id === request.requester.id}
        mineLabel={() => 'Bạn'}
        onSend={finished ? null : handleSend}
        sending={send.isPending}
        error={sendError}
        closedNote="Yêu cầu đã đóng. Nếu vẫn cần hỗ trợ, hãy gửi yêu cầu mới."
      />

      <ConfirmDialog
        open={confirmCancel}
        title="Hủy yêu cầu hỗ trợ?"
        description="Trung tâm sẽ ngừng xử lý yêu cầu này và bạn không thể nhắn thêm."
        confirmLabel="Hủy yêu cầu"
        tone="danger"
        loading={cancel.isPending}
        error={cancelError && <InlineAlert>{cancelError}</InlineAlert>}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
