import { CalendarBlank, ClockCounterClockwise, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { Tabs } from '../../../components/ui/Tabs';
import { inputClass, tabPanelProps } from '../../../components/ui/styles';
import { useStaffList } from '../../staff/hooks/useStaff';
import { parseApiError } from '../../training/errors';
import { addDays, formatDate, formatDateTime, formatTime, formatWeekday, fromCenterDateTimeInput, toCenterDate, toCenterDateTimeInput, todayInCenter, weekRange } from '../../training/format';
import { ReasonDialog, WeekNav } from '../components';
import { useAdjustments, useCancelShift, useCreateShift, useReviewAdjustment, useShifts, useUpdateShift } from '../hooks';
import { adjustmentLabels, attendanceLabels, formatMinutes, shiftRange } from '../labels';
import type { AdjustmentListItem, StaffShift } from '../types';

type Tab = 'shifts' | 'adjustments';
const tabs = [
  { value: 'shifts', label: 'Lịch ca' },
  { value: 'adjustments', label: 'Yêu cầu sửa công' },
] as const;

// FR-67 · /app/staff-shifts: Manager xếp ca lễ tân, xem chấm công, duyệt yêu cầu sửa công
export function StaffShiftsPage() {
  const [tab, setTab] = useState<Tab>('shifts');
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Nhân sự"
        title="Ca làm lễ tân"
        description="Xếp ca, theo dõi giờ vào/ra thực tế và duyệt yêu cầu sửa công. Đây là dữ liệu công để tính lương lễ tân."
      />
      <div className="mb-5">
        <Tabs label="Ca làm lễ tân" idPrefix="staff-shifts" tabs={tabs} value={tab} onChange={setTab} />
      </div>
      <div {...tabPanelProps('staff-shifts', tab)}>{tab === 'shifts' ? <ShiftsTab /> : <AdjustmentsTab />}</div>
    </div>
  );
}

type FormState = { open: false } | { open: true; shift: StaffShift | null };

function ShiftsTab() {
  const [range, setRange] = useState(() => weekRange(todayInCenter()));
  const [staffId, setStaffId] = useState('');
  const [form, setForm] = useState<FormState>({ open: false });
  const [cancelTarget, setCancelTarget] = useState<StaffShift | null>(null);
  // note: danh sách lễ tân lấy từ API nhân sự FR-07
  const receptionists = useStaffList({ role: 'RECEPTIONIST', page: 1, pageSize: 100 });
  const shifts = useShifts({ ...range, staffId: staffId ? Number(staffId) : undefined });
  const cancel = useCancelShift();
  const items = shifts.data ?? [];

  // note: gom ca theo ngày (giờ trung tâm) để dễ nhìn theo tuần
  const days = Array.from({ length: 7 }, (_, index) => addDays(range.from, index));
  const byDay = (day: string) => items.filter((shift) => toCenterDate(new Date(shift.startsAt)) === day);

  return (
    <>
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <WeekNav from={range.from} to={range.to} onShift={(delta) => setRange((current) => shiftRange(current, delta))} onToday={() => setRange(weekRange(todayInCenter()))} />
        <div className="flex flex-wrap gap-2">
          <label className="block">
            <span className="sr-only">Lọc theo lễ tân</span>
            <select className={inputClass} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Tất cả lễ tân</option>
              {(receptionists.data?.items ?? []).map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.displayName}
                </option>
              ))}
            </select>
          </label>
          <Button icon={<Plus aria-hidden="true" />} onClick={() => setForm({ open: true, shift: null })}>
            Xếp ca
          </Button>
        </div>
      </Card>

      {shifts.isPending ? (
        <ListSkeleton rows={5} label="Đang tải ca làm…" />
      ) : shifts.isError ? (
        <ErrorState error={shifts.error} onRetry={() => shifts.refetch()} retrying={shifts.isRefetching} pendingApi="GET /api/staff-shifts" />
      ) : items.length === 0 ? (
        <EmptyState icon={<CalendarBlank />} title="Chưa có ca làm trong tuần này" description='Bấm "Xếp ca" để tạo ca cho lễ tân.' />
      ) : (
        <div className={`grid gap-4 transition-opacity ${shifts.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={shifts.isFetching}>
          {days.filter((day) => byDay(day).length > 0).map((day) => (
            <section key={day} aria-label={`${formatWeekday(day)} ${formatDate(day)}`}>
              <h2 className="mb-2 text-sm font-extrabold text-ink">
                {formatWeekday(day)} · {formatDate(day)}
              </h2>
              <ul className="grid gap-2">
                {byDay(day).map((shift) => (
                  <ShiftRow key={shift.id} shift={shift} onEdit={() => setForm({ open: true, shift })} onCancel={() => setCancelTarget(shift)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {form.open && <ShiftFormDialog shift={form.shift} receptionists={(receptionists.data?.items ?? []).map((staff) => ({ id: staff.id, name: staff.displayName }))} onClose={() => setForm({ open: false })} />}
      <ReasonDialog
        open={cancelTarget !== null}
        title="Hủy ca làm"
        description={cancelTarget ? `${cancelTarget.staff.displayName} · ${formatDateTime(cancelTarget.startsAt)} – ${formatTime(cancelTarget.endsAt)}` : undefined}
        label="Lý do hủy"
        confirmLabel="Hủy ca"
        tone="danger"
        onClose={() => setCancelTarget(null)}
        onSubmit={(reason) => cancel.mutateAsync({ id: cancelTarget!.id, reason })}
      />
    </>
  );
}

function ShiftRow({ shift, onEdit, onCancel }: { shift: StaffShift; onEdit: () => void; onCancel: () => void }) {
  const state = attendanceLabels[shift.attendance];
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">
          {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)} · {shift.staff.displayName}
          {shift.staff.staffCode && <span className="ml-1 font-mono text-xs text-muted">{shift.staff.staffCode}</span>}
        </p>
        <p className="text-xs text-muted">
          Vào: {shift.clockInAt ? formatTime(shift.clockInAt) : '—'} · Ra: {shift.clockOutAt ? formatTime(shift.clockOutAt) : '—'}
          {shift.lateMinutes > 0 && ` · Trễ ${formatMinutes(shift.lateMinutes)}`}
          {shift.earlyLeaveMinutes > 0 && ` · Về sớm ${formatMinutes(shift.earlyLeaveMinutes)}`}
          {shift.note && ` · ${shift.note}`}
          {shift.cancelReason && ` · Lý do hủy: ${shift.cancelReason}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {shift.pendingAdjustment && <Chip tone="warning">Có yêu cầu sửa công</Chip>}
        <Chip tone={state.tone} dot>
          {state.label}
        </Chip>
        {shift.editable && (
          <>
            <Button size="sm" variant="secondary" onClick={onEdit} aria-label={`Sửa ca ${shift.staff.displayName}`}>
              Sửa
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} aria-label={`Hủy ca ${shift.staff.displayName}`}>
              Hủy ca
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

// note: tạo hoặc sửa ca; giờ kết thúc nhỏ hơn giờ bắt đầu nghĩa là ca qua đêm (sang ngày hôm sau)
function ShiftFormDialog({ shift, receptionists, onClose }: { shift: StaffShift | null; receptionists: { id: number; name: string }[]; onClose: () => void }) {
  const create = useCreateShift();
  const update = useUpdateShift();
  const start = shift ? toCenterDateTimeInput(shift.startsAt) : `${todayInCenter()}T08:00`;
  const [staffId, setStaffId] = useState(shift ? String(shift.staff.id) : '');
  const [date, setDate] = useState(start.slice(0, 10));
  const [startTime, setStartTime] = useState(start.slice(11, 16));
  const [endTime, setEndTime] = useState(shift ? toCenterDateTimeInput(shift.endsAt).slice(11, 16) : '12:00');
  const [note, setNote] = useState(shift?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const submit = () => {
    if (!shift && !staffId) return setError('Vui lòng chọn lễ tân.');
    if (!date || !startTime || !endTime) return setError('Vui lòng nhập đủ ngày và giờ.');
    const endDate = endTime <= startTime ? addDays(date, 1) : date;
    const startsAt = fromCenterDateTimeInput(`${date}T${startTime}`);
    const endsAt = fromCenterDateTimeInput(`${endDate}T${endTime}`);
    setError(null);
    const onError = (caught: unknown) => setError(parseApiError(caught).message);
    if (shift) {
      update.mutate({ id: shift.id, input: { startsAt, endsAt, note: note.trim() || null } }, { onSuccess: onClose, onError });
    } else {
      create.mutate({ staffId: Number(staffId), startsAt, endsAt, ...(note.trim() ? { note: note.trim() } : {}) }, { onSuccess: onClose, onError });
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={shift ? 'Sửa ca làm' : 'Xếp ca làm'}
      description={shift ? shift.staff.displayName : 'Lễ tân sẽ nhận thông báo về ca mới.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Đóng
          </Button>
          <Button onClick={submit} loading={saving}>
            {shift ? 'Lưu' : 'Xếp ca'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!shift && (
          <Field id="shift-staff" label="Lễ tân" required className="sm:col-span-2">
            <select id="shift-staff" className={inputClass} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">— Chọn lễ tân —</option>
              {receptionists.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="shift-date" label="Ngày" required className="sm:col-span-2">
          <input id="shift-date" type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field id="shift-start" label="Giờ bắt đầu" required>
          <input id="shift-start" type="time" className={inputClass} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </Field>
        <Field id="shift-end" label="Giờ kết thúc" required hint="Ca dài 1–12 giờ. Giờ kết thúc nhỏ hơn giờ bắt đầu = ca qua đêm.">
          <input id="shift-end" type="time" className={inputClass} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </Field>
        <Field id="shift-note" label="Ghi chú" className="sm:col-span-2">
          <input id="shift-note" className={inputClass} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
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

type Review = { item: AdjustmentListItem; approve: boolean } | null;

function AdjustmentsTab() {
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [review, setReview] = useState<Review>(null);
  const adjustments = useAdjustments(status);
  const reviewMutation = useReviewAdjustment();
  const items = adjustments.data ?? [];
  const time = (value: string | null) => (value ? formatTime(value) : '—');

  return (
    <>
      <Card className="mb-5 p-3 sm:p-4">
        <label className="block max-w-60">
          <span className="sr-only">Trạng thái</span>
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </label>
      </Card>
      {adjustments.isPending ? (
        <ListSkeleton rows={3} label="Đang tải yêu cầu…" />
      ) : adjustments.isError ? (
        <ErrorState error={adjustments.error} onRetry={() => adjustments.refetch()} retrying={adjustments.isRefetching} pendingApi="GET /api/staff-shifts/adjustments" />
      ) : items.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwise />} title="Không có yêu cầu nào" description="Yêu cầu sửa công của lễ tân sẽ hiện ở đây." />
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{item.requestedBy.displayName}</p>
                  <p className="text-xs text-muted">
                    Ca {formatDateTime(item.shift.startsAt)} – {formatTime(item.shift.endsAt)} · gửi lúc {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Chip tone={adjustmentLabels[item.status].tone}>{adjustmentLabels[item.status].label}</Chip>
              </div>
              <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Giờ vào</dt>
                  <dd className="text-ink">
                    {time(item.status === 'APPROVED' ? item.oldClockInAt : item.shift.clockInAt)} → <strong>{item.clockInAt ? formatTime(item.clockInAt) : 'giữ nguyên'}</strong>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Giờ ra</dt>
                  <dd className="text-ink">
                    {time(item.status === 'APPROVED' ? item.oldClockOutAt : item.shift.clockOutAt)} → <strong>{item.clockOutAt ? formatTime(item.clockOutAt) : 'giữ nguyên'}</strong>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Lý do</dt>
                  <dd className="text-ink">{item.reason}</dd>
                </div>
              </dl>
              {item.reviewNote && <p className="mt-2 text-xs text-muted">Ghi chú duyệt: {item.reviewNote}</p>}
              {item.status === 'PENDING' && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setReview({ item, approve: false })}>
                    Từ chối
                  </Button>
                  <Button size="sm" onClick={() => setReview({ item, approve: true })}>
                    Duyệt
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog
        open={review !== null}
        title={review?.approve ? 'Duyệt yêu cầu sửa công' : 'Từ chối yêu cầu sửa công'}
        description={review ? `${review.item.requestedBy.displayName} · ${formatDateTime(review.item.shift.startsAt)}` : undefined}
        label={review?.approve ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối'}
        confirmLabel={review?.approve ? 'Duyệt' : 'Từ chối'}
        tone={review?.approve ? 'primary' : 'danger'}
        optional={review?.approve}
        onClose={() => setReview(null)}
        onSubmit={(note) => reviewMutation.mutateAsync({ id: review!.item.id, approve: review!.approve, note: note || undefined })}
      />
    </>
  );
}
