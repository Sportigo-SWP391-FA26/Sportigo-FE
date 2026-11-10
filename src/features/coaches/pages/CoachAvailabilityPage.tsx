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

const dayLabel = (dayOfWeek: number) => DAYS.find((day) => day.value === dayOfWeek)?.label ?? '';

function shiftMonth(value: string, delta: number) {
  const [year = 0, month = 1] = value.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonthValue() {
  const date = new Date();
  return shiftMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, 1);
}

/** Các ngày trong tháng; `leadingBlanks` đẩy ngày đầu về đúng cột khi tuần bắt đầu từ Thứ 2 */
function monthDays(value: string) {
  const [year = 0, month = 1] = value.split('-').map(Number);
  const total = new Date(year, month, 0).getDate();
  const days = Array.from({ length: total }, (_, index) => ({ date: index + 1, dayOfWeek: new Date(year, month - 1, index + 1).getDay() }));
  return { days, leadingBlanks: ((days[0]?.dayOfWeek ?? 1) + 6) % 7 };
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
  const [activeDay, setActiveDay] = useState(1);
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
  const rules = calendar.data?.rules;
  const minimumShifts = rules?.minimumShifts ?? 0;
  const minimumDays = rules?.minimumDays ?? 5;
  const minimumPerDay = rules?.minimumPerSelectedDay ?? 2;
  const maximumPerDay = rules?.maximumPerDay ?? 4;
  const valid = Boolean(
    rules
    && counts.total >= minimumShifts
    && counts.days >= minimumDays
    && [...counts.perDay.values()].every((count) => count >= minimumPerDay && count <= maximumPerDay),
  );
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
    if (!exists && (counts.perDay.get(cell.dayOfWeek) ?? 0) >= maximumPerDay) {
      toast(`Mỗi ngày chỉ được chọn tối đa ${maximumPerDay} ca.`, 'error'); return;
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
      <PageHeader title="Đăng ký lịch có thể nhận lớp" description="Chọn một ngày trên lịch rồi chọn ca. Ca sẽ lặp lại vào cùng thứ trong cả tháng. Đây là availability, không phải lịch dạy đã được phân công." actions={calendar.data && <Chip tone={statusTone[calendar.data.submission.status]} dot>{statusLabel[calendar.data.submission.status]}</Chip>} />
      <Card className="mb-5 overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" aria-label="Tháng trước" onClick={() => { setSelected(null); setMonth((value) => shiftMonth(value, -1)); }} icon={<CaretLeft />} />
            <div className="min-w-36 text-center"><p className="font-extrabold text-ink">{displayMonth(month)}</p><p className="text-xs text-muted">Asia/Ho_Chi_Minh</p></div>
            <Button variant="ghost" size="sm" aria-label="Tháng sau" onClick={() => { setSelected(null); setMonth((value) => shiftMonth(value, 1)); }} icon={<CaretRight />} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip tone={counts.total >= minimumShifts ? 'success' : 'warning'}>{counts.total}/{minimumShifts} ca</Chip>
            <Chip tone={counts.days >= minimumDays ? 'success' : 'warning'}>{counts.days}/{minimumDays} ngày</Chip>
            <Chip tone="info">{minimumPerDay}–{maximumPerDay} ca/ngày</Chip>
          </div>
        </div>
        {calendar.isPending ? <div className="p-6"><ListSkeleton rows={5} /></div> : calendar.isError ? <div className="p-6"><ErrorState error={calendar.error} onRetry={() => calendar.refetch()} /></div> : calendar.data ? (
          <div className="p-4 sm:p-6">
            {calendar.data.submission.rejectionReason && <div className="mb-4"><InlineAlert>{calendar.data.submission.rejectionReason}</InlineAlert></div>}
            <MonthCalendar
              month={month}
              activeDay={activeDay}
              shiftCodesFor={(dayOfWeek) => workingSelected.filter((item) => item.dayOfWeek === dayOfWeek).map((item) => item.shiftCode).sort()}
              maximumPerDay={maximumPerDay}
              onSelectDay={setActiveDay}
            />
            <section className="mt-4 rounded-2xl border border-line p-4" aria-label={`Ca dạy ${dayLabel(activeDay)}`}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-extrabold text-ink">Ca dạy {dayLabel(activeDay)}</h2>
                <p className="text-xs font-semibold text-muted">Áp dụng cho mọi {dayLabel(activeDay)} trong tháng · {counts.perDay.get(activeDay) ?? 0}/{maximumPerDay} ca</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                {calendar.data.shifts.map((shift) => {
                  const key = `${activeDay}:${shift.code}`;
                  const active = workingSelected.some((item) => `${item.dayOfWeek}:${item.shiftCode}` === key);
                  const assigned = selectionMap.get(key)?.isAssigned;
                  const status = calendar.data.submission.status;
                  const state = assigned ? 'Đã phân công' : active ? status === 'APPROVED' ? 'Đã duyệt' : status === 'SUBMITTED' ? 'Chờ duyệt' : 'Đã chọn' : 'Còn trống';
                  return <button key={shift.code} type="button" onClick={() => toggle({ dayOfWeek: activeDay, shiftCode: shift.code })} disabled={!editable && !assigned} aria-pressed={active} aria-label={`${dayLabel(activeDay)}, ${shift.startTime}–${shift.endTime}: ${state}`} className={`flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-primary ${assigned ? 'bg-ink text-white' : active ? status === 'APPROVED' ? 'bg-accent-lime/25 text-ink' : status === 'SUBMITTED' ? 'bg-accent-energy/18 text-ink' : 'bg-primary text-white' : 'bg-canvas text-muted hover:bg-primary/8 disabled:hover:bg-canvas'}`}>{assigned ? <LockKey weight="fill" className="text-base" /> : active ? <Check weight="bold" className="text-base" /> : <Clock className="text-base" />}<span>{shift.startTime}–{shift.endTime}</span><span className="font-semibold opacity-80">{state}</span></button>;
                })}
              </div>
            </section>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-muted">Gửi lịch tháng sau trước ngày {rules?.submitDeadlineDay}. Nếu bị từ chối, bạn có thể sửa và gửi lại đến hết ngày {rules?.resubmitDeadlineDay}. Ca đã phân công được khóa và vẫn tính vào tổng ca.</p>
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

type MonthCalendarProps = {
  month: string;
  activeDay: number;
  maximumPerDay: number;
  shiftCodesFor: (dayOfWeek: number) => string[];
  onSelectDay: (dayOfWeek: number) => void;
};

function MonthCalendar({ month, activeDay, maximumPerDay, shiftCodesFor, onSelectDay }: MonthCalendarProps) {
  const { days, leadingBlanks } = monthDays(month);
  const dayClass = (dayOfWeek: number) => dayOfWeek === activeDay ? 'border-primary bg-primary/8' : 'border-line bg-surface hover:border-primary/40';
  return (
    <>
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day) => <div key={day.value} className="py-2 text-center text-xs font-extrabold text-muted">{day.label}</div>)}
          {Array.from({ length: leadingBlanks }, (_, index) => <div key={`blank-${index}`} aria-hidden="true" />)}
          {days.map((day) => {
            const codes = shiftCodesFor(day.dayOfWeek);
            return <button key={day.date} type="button" aria-pressed={day.dayOfWeek === activeDay} aria-label={`Ngày ${day.date}, ${dayLabel(day.dayOfWeek)}: ${codes.length} ca`} onClick={() => onSelectDay(day.dayOfWeek)} className={`min-h-24 rounded-xl border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-primary ${dayClass(day.dayOfWeek)}`}>
              <span className="flex items-center justify-between"><b className="text-sm text-ink">{day.date}</b><span className="text-[11px] font-semibold text-muted">{codes.length}/{maximumPerDay}</span></span>
              <span className="mt-1.5 flex flex-wrap gap-1">{codes.map((code) => <span key={code} className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{code}</span>)}</span>
            </button>;
          })}
        </div>
      </div>
      <ul className="max-h-96 space-y-1.5 overflow-y-auto md:hidden">
        {days.map((day) => {
          const codes = shiftCodesFor(day.dayOfWeek);
          return <li key={day.date}><button type="button" aria-pressed={day.dayOfWeek === activeDay} onClick={() => onSelectDay(day.dayOfWeek)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${dayClass(day.dayOfWeek)}`}>
            <b className="w-20 shrink-0 text-sm text-ink">{day.date} · {DAYS.find((item) => item.value === day.dayOfWeek)?.short}</b>
            <span className="flex flex-1 flex-wrap gap-1">{codes.length ? codes.map((code) => <span key={code} className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{code}</span>) : <span className="text-xs text-muted">Chưa chọn ca</span>}</span>
          </button></li>;
        })}
      </ul>
    </>
  );
}
