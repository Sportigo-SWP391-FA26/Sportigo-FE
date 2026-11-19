import { CalendarCheck, Clock, SignIn, SignOut, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, StatTile } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { parseApiError } from '../../training/errors';
import { formatDate, formatDateTime, formatTime, formatWeekday, fromCenterDateTimeInput, toCenterDateTimeInput, todayInCenter, weekRange } from '../../training/format';
import { WeekNav } from '../components';
import { useClockIn, useClockOut, useMyShifts, useRequestAdjustment } from '../hooks';
import { adjustmentLabels, attendanceLabels, formatMinutes, shiftRange } from '../labels';
import type { StaffShift } from '../types';

// FR-67 · /app/my-shifts: lễ tân xem ca của mình, bấm vào/ra ca, xin sửa công
export function MyShiftsPage() {
  const [range, setRange] = useState(() => weekRange(todayInCenter()));
  const [adjustTarget, setAdjustTarget] = useState<StaffShift | null>(null);
  const shifts = useMyShifts(range);
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const actionError = clockIn.error ?? clockOut.error;
  const items = shifts.data?.items ?? [];
  const summary = shifts.data?.summary;

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <PageHeader eyebrow="Nhân sự" title="Ca làm của tôi" description="Bấm Vào ca khi bắt đầu (sớm nhất 30 phút trước giờ ca) và Ra ca khi kết thúc. Quên bấm thì gửi yêu cầu sửa công." />

      <Card className="mb-5 p-3 sm:p-4">
        <WeekNav from={range.from} to={range.to} onShift={(days) => setRange((current) => shiftRange(current, days))} onToday={() => setRange(weekRange(todayInCenter()))} />
      </Card>

      {summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatTile label="Ca hoàn thành" value={`${summary.completed}/${summary.scheduled}`} icon={<CalendarCheck />} />
          <StatTile label="Giờ làm thực tế" value={formatMinutes(summary.workedMinutes)} icon={<Clock />} tone="sky" />
          <StatTile label="Trễ / về sớm / vắng" value={`${summary.lateCount} / ${summary.earlyLeaveCount} / ${summary.absent}`} icon={<Warning />} tone="energy" />
        </div>
      )}

      {actionError && (
        <div className="mb-4">
          <InlineAlert>{parseApiError(actionError).message}</InlineAlert>
        </div>
      )}

      {shifts.isPending ? (
        <ListSkeleton rows={4} label="Đang tải ca làm…" />
      ) : shifts.isError ? (
        <ErrorState error={shifts.error} onRetry={() => shifts.refetch()} retrying={shifts.isRefetching} pendingApi="GET /api/staff-shifts/me" />
      ) : items.length === 0 ? (
        <EmptyState icon={<CalendarCheck />} title="Tuần này bạn chưa có ca" description="Ca do Quản lý xếp sẽ hiện ở đây." />
      ) : (
        <ul className="grid gap-3" aria-busy={shifts.isFetching}>
          {items.map((shift) => {
            const state = attendanceLabels[shift.attendance];
            const canAdjust = shift.status === 'SCHEDULED' && shift.attendance !== 'UPCOMING' && !shift.pendingAdjustment;
            return (
              <li key={shift.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-muted uppercase">
                      {formatWeekday(shift.startsAt)} · {formatDate(shift.startsAt)}
                    </p>
                    <p className="text-lg font-extrabold text-ink">
                      {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
                    </p>
                    {shift.note && <p className="text-sm text-muted">{shift.note}</p>}
                  </div>
                  <Chip tone={state.tone} dot>
                    {state.label}
                  </Chip>
                </div>
                <p className="mt-2 text-sm text-ink">
                  Vào: <strong>{shift.clockInAt ? formatTime(shift.clockInAt) : '—'}</strong> · Ra: <strong>{shift.clockOutAt ? formatTime(shift.clockOutAt) : '—'}</strong>
                  {shift.lateMinutes > 0 && <span className="text-danger"> · Trễ {formatMinutes(shift.lateMinutes)}</span>}
                  {shift.earlyLeaveMinutes > 0 && <span className="text-danger"> · Về sớm {formatMinutes(shift.earlyLeaveMinutes)}</span>}
                </p>
                {shift.cancelReason && <p className="mt-1 text-sm text-muted">Lý do hủy: {shift.cancelReason}</p>}
                {shift.adjustments[0] && (
                  <p className="mt-2 text-xs text-muted">
                    Yêu cầu sửa công gần nhất: <Chip tone={adjustmentLabels[shift.adjustments[0].status].tone}>{adjustmentLabels[shift.adjustments[0].status].label}</Chip>
                    {shift.adjustments[0].reviewNote && ` · ${shift.adjustments[0].reviewNote}`}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {canAdjust && (
                    <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(shift)}>
                      Xin sửa công
                    </Button>
                  )}
                  {shift.canClockOut && (
                    <Button size="sm" variant="secondary" icon={<SignOut aria-hidden="true" />} loading={clockOut.isPending && clockOut.variables === shift.id} onClick={() => clockOut.mutate(shift.id)}>
                      Ra ca
                    </Button>
                  )}
                  {shift.canClockIn && (
                    <Button size="sm" icon={<SignIn aria-hidden="true" />} loading={clockIn.isPending && clockIn.variables === shift.id} onClick={() => clockIn.mutate(shift.id)}>
                      Vào ca
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adjustTarget && <AdjustmentDialog shift={adjustTarget} onClose={() => setAdjustTarget(null)} />}
    </div>
  );
}

// note: xin sửa giờ vào/ra; để trống ô nào thì giữ nguyên giờ đó
function AdjustmentDialog({ shift, onClose }: { shift: StaffShift; onClose: () => void }) {
  const mutation = useRequestAdjustment();
  const [clockInAt, setClockInAt] = useState(shift.clockInAt ? toCenterDateTimeInput(shift.clockInAt) : '');
  const [clockOutAt, setClockOutAt] = useState(shift.clockOutAt ? toCenterDateTimeInput(shift.clockOutAt) : '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const changedIn = clockInAt && (!shift.clockInAt || clockInAt !== toCenterDateTimeInput(shift.clockInAt)) ? fromCenterDateTimeInput(clockInAt) : undefined;
    const changedOut = clockOutAt && (!shift.clockOutAt || clockOutAt !== toCenterDateTimeInput(shift.clockOutAt)) ? fromCenterDateTimeInput(clockOutAt) : undefined;
    if (!changedIn && !changedOut) return setError('Hãy đổi giờ vào hoặc giờ ra muốn sửa.');
    if (reason.trim().length < 3) return setError('Vui lòng nhập lý do (tối thiểu 3 ký tự).');
    setError(null);
    mutation.mutate(
      { id: shift.id, input: { ...(changedIn ? { clockInAt: changedIn } : {}), ...(changedOut ? { clockOutAt: changedOut } : {}), reason: reason.trim() } },
      { onSuccess: onClose, onError: (caught) => setError(parseApiError(caught).message) },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Xin sửa công"
      description={`Ca ${formatDateTime(shift.startsAt)} – ${formatTime(shift.endsAt)}. Quản lý duyệt xong giờ mới được ghi nhận.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Đóng
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            Gửi yêu cầu
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="adjust-in" label="Giờ vào đúng">
          <input id="adjust-in" type="datetime-local" className={inputClass} value={clockInAt} onChange={(event) => setClockInAt(event.target.value)} />
        </Field>
        <Field id="adjust-out" label="Giờ ra đúng">
          <input id="adjust-out" type="datetime-local" className={inputClass} value={clockOutAt} onChange={(event) => setClockOutAt(event.target.value)} />
        </Field>
        <Field id="adjust-reason" label="Lý do" required className="sm:col-span-2">
          <textarea id="adjust-reason" className={textareaClass} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        {error && (
          <div className="sm:col-span-2">
            <InlineAlert>{error}</InlineAlert>
          </div>
        )}
      </div>
    </Dialog>
  );
}
