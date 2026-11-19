import { ArrowsLeftRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { parseApiError } from '../../training/errors';
import { formatDate, formatTime, formatWeekday, todayInCenter, weekRange } from '../../training/format';
import { WeekNav } from '../components';
import { useAssignSubstitute, useResetSessionCoach, useSessionCoaches, useSubstituteCandidates } from '../hooks';
import { shiftRange } from '../labels';
import type { SessionCoachItem } from '../types';

// FR-66 · /app/session-coaches: Manager ghi nhận coach dạy thực tế từng buổi (dạy thay, coach vắng)
export function SessionCoachesPage() {
  const [range, setRange] = useState(() => weekRange(todayInCenter()));
  const [changedOnly, setChangedOnly] = useState(false);
  const [substituteFor, setSubstituteFor] = useState<SessionCoachItem | null>(null);
  const [resetFor, setResetFor] = useState<SessionCoachItem | null>(null);
  const sessions = useSessionCoaches({ ...range, changedOnly });
  const reset = useResetSessionCoach();
  const items = sessions.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Nhân sự"
        title="Dạy thay & coach vắng"
        description="Ghi nhận ai thực sự dạy từng buổi. Dữ liệu này là căn cứ tính tiền buổi dạy: người dạy thay được tính, coach chính vắng thì không."
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <WeekNav from={range.from} to={range.to} onShift={(days) => setRange((current) => shiftRange(current, days))} onToday={() => setRange(weekRange(todayInCenter()))} />
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" className="size-4 accent-primary" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} />
          Chỉ buổi có dạy thay / vắng
        </label>
      </Card>

      {sessions.isPending ? (
        <ListSkeleton rows={5} label="Đang tải buổi học…" />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} retrying={sessions.isRefetching} pendingApi="GET /api/session-coaches" />
      ) : items.length === 0 ? (
        <EmptyState icon={<ArrowsLeftRight />} title="Không có buổi học trong tuần này" description="Chọn tuần khác hoặc bỏ lọc." />
      ) : (
        <ul className={`grid gap-3 transition-opacity ${sessions.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={sessions.isFetching}>
          {items.map((session) => {
            const changed = session.replacedCoach !== null || session.coachAbsent;
            return (
              <li key={session.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted uppercase">
                      {formatWeekday(session.startsAt)} · {formatDate(session.startsAt)} · {formatTime(session.startsAt)}–{formatTime(session.endsAt)} · {session.room.name}
                    </p>
                    <h2 className="mt-1 text-base font-extrabold text-ink">{session.class.name}</h2>
                    <p className="text-sm text-muted">{session.class.sport.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.status === 'CANCELLED' && <Chip tone="neutral">Buổi đã hủy</Chip>}
                    {session.replacedCoach && <Chip tone="info">Dạy thay</Chip>}
                    {session.coachAbsent && <Chip tone="danger">Coach chính vắng</Chip>}
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted">Coach của lớp</dt>
                    <dd className="font-semibold text-ink">{session.classCoach?.displayName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Người dạy thực tế</dt>
                    <dd className="font-semibold text-ink">
                      {session.coachAbsent && !session.replacedCoach ? 'Không có (vắng)' : session.actualCoach?.displayName ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Lý do</dt>
                    <dd className="text-ink">{session.reason ?? '—'}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {!session.canChange && session.lockReason && <p className="mr-auto text-xs text-muted">Không đổi được: {session.lockReason}</p>}
                  {changed && (
                    <Button size="sm" variant="ghost" disabled={!session.canChange} onClick={() => setResetFor(session)}>
                      Hoàn tác
                    </Button>
                  )}
                  <Button size="sm" disabled={!session.canChange} onClick={() => setSubstituteFor(session)}>
                    Giao dạy thay
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SubstituteDialog session={substituteFor} onClose={() => setSubstituteFor(null)} />
      <ConfirmDialog
        open={resetFor !== null}
        title="Hoàn tác về coach chính?"
        description="Xóa thông tin dạy thay / vắng của buổi này. Các coach liên quan sẽ nhận thông báo."
        confirmLabel="Hoàn tác"
        loading={reset.isPending}
        error={reset.isError ? <InlineAlert>{parseApiError(reset.error).message}</InlineAlert> : undefined}
        onConfirm={() => reset.mutate(resetFor!.id, { onSuccess: () => setResetFor(null) })}
        onCancel={() => {
          reset.reset();
          setResetFor(null);
        }}
      />
    </div>
  );
}

// note: hộp thoại chọn người dạy thay; danh sách coach cùng môn lấy từ backend kèm cờ rảnh/bận
function SubstituteDialog({ session, onClose }: { session: SessionCoachItem | null; onClose: () => void }) {
  const candidates = useSubstituteCandidates(session?.id ?? null);
  const assign = useAssignSubstitute();
  const [coachId, setCoachId] = useState('');
  const [reason, setReason] = useState('');
  const [coachAbsent, setCoachAbsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCoachId('');
    setReason('');
    setCoachAbsent(false);
    setError(null);
    assign.reset();
    onClose();
  };

  const submit = () => {
    if (!coachId) return setError('Vui lòng chọn coach dạy thay.');
    if (reason.trim().length < 3) return setError('Vui lòng nhập lý do (tối thiểu 3 ký tự).');
    setError(null);
    assign.mutate(
      { sessionId: session!.id, input: { coachId: Number(coachId), reason: reason.trim(), coachAbsent } },
      { onSuccess: close, onError: (caught) => setError(parseApiError(caught).message) },
    );
  };

  return (
    <Dialog
      open={session !== null}
      onClose={close}
      title="Giao người dạy thay"
      description={session ? `${session.class.name} · ${formatDate(session.startsAt)} ${formatTime(session.startsAt)}–${formatTime(session.endsAt)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={assign.isPending}>
            Đóng
          </Button>
          <Button onClick={submit} loading={assign.isPending}>
            Giao dạy thay
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field id="substitute-coach" label="Coach dạy thay" required hint="Chỉ hiện coach dạy được môn này. Coach bận giờ đó không chọn được.">
          <select id="substitute-coach" className={inputClass} value={coachId} onChange={(event) => setCoachId(event.target.value)} disabled={candidates.isPending}>
            <option value="">{candidates.isPending ? 'Đang tải…' : '— Chọn coach —'}</option>
            {(candidates.data ?? []).map((coach) => (
              <option key={coach.id} value={coach.id} disabled={!coach.available}>
                {coach.displayName} ({coach.code}){coach.available ? '' : ' – bận'}
              </option>
            ))}
          </select>
        </Field>
        {candidates.isSuccess && candidates.data.length === 0 && <InlineAlert tone="warning">Không có coach nào khác dạy được môn này.</InlineAlert>}
        <Field id="substitute-reason" label="Lý do" required>
          <textarea id="substitute-reason" className={textareaClass} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={coachAbsent} onChange={(event) => setCoachAbsent(event.target.checked)} />
          <span>
            Coach chính <strong>vắng không báo trước</strong> (lỗi của coach, sẽ trừ điểm hiệu suất). Bỏ chọn nếu trung tâm chủ động đổi người.
          </span>
        </label>
        {error && <InlineAlert>{error}</InlineAlert>}
      </div>
    </Dialog>
  );
}
