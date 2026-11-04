import { CalendarBlank, CaretLeft, CaretRight, Check, Clock, LockKey, PaperPlaneTilt, PencilSimpleLine } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../../training/errors';
import { useCreateAvailabilityChangeRequest, useMyAvailabilityCalendar, useMyAvailabilityChangeRequests, useSaveMyAvailabilityDraft, useSubmitMyAvailability } from '../hooks/useCoachManagement';
import type { AvailabilitySelection, AvailabilitySubmissionStatus } from '../types';

const DAYS = [
  { value: 1, label: 'Thứ 2', short: 'T2' }, { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' }, { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' }, { value: 6, label: 'Thứ 7', short: 'T7' },
  { value: 0, label: 'Chủ nhật', short: 'CN' },
];

function nextMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 2).padStart(2, '0')}`;
}

function shiftMonth(value: string, delta: number) {
  const [year = 0, month = 1] = value.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function displayMonth(value: string) {
  const [year, month] = value.split('-');
  return `Tháng ${Number(month)} / ${year}`;
}

const statusLabel: Record<AvailabilitySubmissionStatus, string> = {
  DRAFT: 'Bản nháp', SUBMITTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Cần chỉnh sửa',
};

const statusTone: Record<AvailabilitySubmissionStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral', SUBMITTED: 'warning', APPROVED: 'success', REJECTED: 'danger',
};

type Cell = { dayOfWeek: number; shiftCode: string };

export function CoachAvailabilityPage() {
  const [month, setMonth] = useState(nextMonthValue);
  const calendar = useMyAvailabilityCalendar(month);
  const saveDraft = useSaveMyAvailabilityDraft(month);
  const submit = useSubmitMyAvailability(month);
  const changes = useMyAvailabilityChangeRequests();
  const [selected, setSelected] = useState<Cell[] | null>(null);
  const [changeTarget, setChangeTarget] = useState<AvailabilitySelection | null>(null);
  const [replacement, setReplacement] = useState({ dayOfWeek: 1, shiftCode: 'S1', reason: '' });
  const createChange = useCreateAvailabilityChangeRequest(month);

  const serverSelections = useMemo(
    () => calendar.data?.submission.selections.map(({ dayOfWeek, shiftCode }) => ({ dayOfWeek, shiftCode })) ?? [],
    [calendar.data?.submission.selections],
  );
  const workingSelected = selected ?? serverSelections;

  const counts = useMemo(() => {
    const perDay = new Map<number, number>();
    workingSelected.forEach((item) => perDay.set(item.dayOfWeek, (perDay.get(item.dayOfWeek) ?? 0) + 1));
    return { total: workingSelected.length, days: perDay.size, perDay };
  }, [workingSelected]);
  const valid = counts.total >= 10 && counts.days >= 5 && [...counts.perDay.values()].every((count) => count >= 2 && count <= 4);
  const editable = calendar.data ? ['DRAFT', 'REJECTED'].includes(calendar.data.submission.status) && month === nextMonthValue() : false;

  const selectionMap = useMemo(() => new Map(calendar.data?.submission.selections.map((item) => [`${item.dayOfWeek}:${item.shiftCode}`, item]) ?? []), [calendar.data]);

  const toggle = (cell: Cell) => {
    const key = `${cell.dayOfWeek}:${cell.shiftCode}`;
    const stored = selectionMap.get(key);
    if (stored?.isAssigned) {
      setChangeTarget(stored);
      setReplacement({ dayOfWeek: cell.dayOfWeek, shiftCode: cell.shiftCode, reason: '' });
      return;
    }
    if (!editable) return;
    const exists = workingSelected.some((item) => `${item.dayOfWeek}:${item.shiftCode}` === key);
    if (!exists && (counts.perDay.get(cell.dayOfWeek) ?? 0) >= 4) {
      toast('Mỗi ngày chỉ được chọn tối đa 4 ca.', 'error'); return;
    }
    setSelected(exists ? workingSelected.filter((item) => `${item.dayOfWeek}:${item.shiftCode}` !== key) : [...workingSelected, cell]);
  };

  const save = async () => {
    try { await saveDraft.mutateAsync(workingSelected); setSelected(null); toast('Đã lưu bản nháp availability.'); }
    catch (error) { toast(parseApiError(error).message, 'error'); }
  };
  const send = async () => {
    try { await saveDraft.mutateAsync(workingSelected); await submit.mutateAsync(); setSelected(null); toast('Đã gửi lịch cho Center Manager duyệt.'); }
    catch (error) { toast(parseApiError(error).message, 'error'); }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <PageHeader title="Đăng ký lịch có thể nhận lớp" description="Chọn các ca bạn có thể dạy lặp lại mỗi tuần. Đây là availability, không phải lịch dạy đã được phân công." actions={calendar.data && <Chip tone={statusTone[calendar.data.submission.status]} dot>{statusLabel[calendar.data.submission.status]}</Chip>} />
      <Card className="mb-5 overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" aria-label="Tháng trước" onClick={() => { setSelected(null); setMonth((value) => shiftMonth(value, -1)); }} icon={<CaretLeft />} />
            <div className="min-w-36 text-center"><p className="font-extrabold text-ink">{displayMonth(month)}</p><p className="text-xs text-muted">Asia/Ho_Chi_Minh</p></div>
            <Button variant="ghost" size="sm" aria-label="Tháng sau" onClick={() => { setSelected(null); setMonth((value) => shiftMonth(value, 1)); }} icon={<CaretRight />} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip tone={counts.total >= 10 ? 'success' : 'warning'}>{counts.total}/10 ca</Chip>
            <Chip tone={counts.days >= 5 ? 'success' : 'warning'}>{counts.days}/5 ngày</Chip>
            <Chip tone="info">2–4 ca/ngày</Chip>
          </div>
        </div>
        {calendar.isPending ? <div className="p-6"><ListSkeleton rows={5} /></div> : calendar.isError ? <div className="p-6"><ErrorState error={calendar.error} onRetry={() => calendar.refetch()} /></div> : calendar.data ? (
          <div className="p-4 sm:p-6">
            {calendar.data.submission.rejectionReason && <div className="mb-4"><InlineAlert>{calendar.data.submission.rejectionReason}</InlineAlert></div>}
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[900px] table-fixed border-collapse">
                <thead><tr className="bg-canvas"><th className="w-32 border-b border-r border-line px-3 py-4 text-left text-xs font-bold text-muted">Ca 90 phút</th>{DAYS.map((day) => <th key={day.value} className="border-b border-line px-2 py-4 text-center text-sm font-extrabold text-ink">{day.label}<span className="mt-1 block text-[11px] font-semibold text-muted">{counts.perDay.get(day.value) ?? 0}/4 ca</span></th>)}</tr></thead>
                <tbody>{calendar.data.shifts.map((shift) => <tr key={shift.code}>
                  <th className="border-r border-t border-line bg-canvas/70 px-3 py-3 text-left"><span className="block text-xs font-extrabold text-primary-deep">{shift.code}</span><span className="mt-1 block text-xs font-semibold text-ink">{shift.startTime}–{shift.endTime}</span></th>
                  {DAYS.map((day) => {
                    const key = `${day.value}:${shift.code}`;
                    const active = workingSelected.some((item) => `${item.dayOfWeek}:${item.shiftCode}` === key);
                    const stored = selectionMap.get(key);
                    const assigned = stored?.isAssigned;
                    const state = assigned ? 'Đã phân công' : active ? calendar.data.submission.status === 'APPROVED' ? 'Đã duyệt' : calendar.data.submission.status === 'SUBMITTED' ? 'Chờ duyệt' : 'Đã chọn' : 'Còn trống';
                    return <td key={day.value} className="border-t border-line p-1.5"><button type="button" onClick={() => toggle({ dayOfWeek: day.value, shiftCode: shift.code })} disabled={!editable && !assigned} aria-pressed={active} aria-label={`${day.label}, ${shift.startTime}–${shift.endTime}: ${state}`} className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-primary ${assigned ? 'bg-ink text-white' : active ? calendar.data.submission.status === 'APPROVED' ? 'bg-accent-lime/25 text-ink' : calendar.data.submission.status === 'SUBMITTED' ? 'bg-accent-energy/18 text-ink' : 'bg-primary text-white' : 'bg-canvas text-muted hover:bg-primary/8 disabled:hover:bg-canvas'}`}>{assigned ? <LockKey weight="fill" className="text-base" /> : active ? <Check weight="bold" className="text-base" /> : <Clock className="text-base" />}<span>{state}</span></button></td>;
                  })}
                </tr>)}</tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-muted">Gửi lịch tháng sau trước ngày 25. Nếu bị từ chối, bạn có thể sửa và gửi lại đến hết ngày 28. Ca đã phân công được khóa và vẫn tính vào tổng ca.</p>
              {editable && <div className="flex shrink-0 gap-2"><Button variant="secondary" onClick={save} loading={saveDraft.isPending} icon={<PencilSimpleLine />}>Lưu nháp</Button><Button onClick={send} loading={submit.isPending || saveDraft.isPending} disabled={!valid} icon={<PaperPlaneTilt />}>Gửi duyệt</Button></div>}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeading title="Yêu cầu đổi ca" description="Các buổi trong vòng 7 ngày giữ nguyên; buổi xa hơn chỉ chuyển khi Coach, Member và phòng đều không xung đột." />
        {changes.isPending ? <ListSkeleton rows={2} /> : changes.isError ? <ErrorState error={changes.error} onRetry={() => changes.refetch()} compact /> : changes.data?.length ? <div className="divide-y divide-line">{changes.data.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-bold text-ink">{DAYS.find((day) => day.value === item.oldDayOfWeek)?.label} {item.oldShiftCode} → {DAYS.find((day) => day.value === item.newDayOfWeek)?.label} {item.newShiftCode}</p><p className="mt-1 text-xs text-muted">{item.reason}</p></div><Chip tone={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'warning'}>{item.status === 'SUBMITTED' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Bị từ chối'}</Chip></div>)}</div> : <EmptyState compact icon={<CalendarBlank />} title="Chưa có yêu cầu đổi ca" description="Nhấn vào ca đã phân công trên thời khóa biểu khi cần đề nghị đổi." />}
      </Card>

      <Dialog open={Boolean(changeTarget)} onClose={() => setChangeTarget(null)} title="Yêu cầu đổi ca đã phân công" description="Center Manager sẽ kiểm tra xung đột trước khi chuyển các buổi đủ điều kiện." footer={<><Button variant="secondary" onClick={() => setChangeTarget(null)}>Đóng</Button><Button loading={createChange.isPending} disabled={replacement.reason.trim().length < 10 || (replacement.dayOfWeek === changeTarget?.dayOfWeek && replacement.shiftCode === changeTarget.shiftCode)} onClick={async () => { if (!changeTarget) return; try { await createChange.mutateAsync({ month, oldDayOfWeek: changeTarget.dayOfWeek, oldShiftCode: changeTarget.shiftCode, newDayOfWeek: replacement.dayOfWeek, newShiftCode: replacement.shiftCode, reason: replacement.reason }); toast('Đã gửi yêu cầu đổi ca.'); setChangeTarget(null); } catch (error) { toast(parseApiError(error).message, 'error'); } }}>Gửi yêu cầu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-ink">Ngày thay thế<select className={`${inputClass} mt-2`} value={replacement.dayOfWeek} onChange={(event) => setReplacement((value) => ({ ...value, dayOfWeek: Number(event.target.value) }))}>{DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label><label className="text-sm font-bold text-ink">Ca thay thế<select className={`${inputClass} mt-2`} value={replacement.shiftCode} onChange={(event) => setReplacement((value) => ({ ...value, shiftCode: event.target.value }))}>{calendar.data?.shifts.map((shift) => <option key={shift.code} value={shift.code}>{shift.startTime}–{shift.endTime}</option>)}</select></label><label className="text-sm font-bold text-ink sm:col-span-2">Lý do<textarea className={`${inputClass} mt-2 min-h-28 resize-y`} value={replacement.reason} onChange={(event) => setReplacement((value) => ({ ...value, reason: event.target.value }))} placeholder="Nêu rõ lý do cần đổi ca…" /></label></div>
      </Dialog>
    </div>
  );
}

