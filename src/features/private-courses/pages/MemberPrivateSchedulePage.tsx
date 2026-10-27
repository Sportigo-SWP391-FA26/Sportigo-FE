import { CalendarBlank } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../training/components/ui/Button';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { inputClass, textareaClass } from '../../training/components/ui/styles';
import { addDays, formatDate, formatTime, fromCenterDateTimeInput, todayInCenter } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { useChangePrivateOccurrence, useMyPrivateEnrollments } from '../hooks/usePrivateCourses';
import type { OccurrenceChange, PrivateEnrollment, PrivateSchedule } from '../types';

type Occurrence = {
  enrollment: PrivateEnrollment;
  schedule: PrivateSchedule;
  originalDate: string;
  startsAt: string;
  endsAt: string;
  action: 'SCHEDULED' | 'CANCELLED' | 'RESCHEDULED';
};

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const hour = (value: string) => value.slice(11, 16);
const makeIso = (date: string, time: string) => `${date}T${time}:00.000Z`;
const occurrenceKey = (scheduleId: number, sessionDate: string) => `${scheduleId}:${sessionDate}`;

function nextOccurrences(enrollment: PrivateEnrollment, schedule: PrivateSchedule, now: number) {
  if (schedule.status !== 'ACTIVE' || enrollment.status !== 'ACTIVE') return [];
  const today = todayInCenter();
  const start = [schedule.effectiveFrom.slice(0, 10), enrollment.startDate.slice(0, 10), today].sort().at(-1)!;
  const end = [schedule.effectiveTo.slice(0, 10), enrollment.expiryDate.slice(0, 10)].sort()[0]!;
  const occurrences: Occurrence[] = [];
  let date = start;
  date = addDays(date, (schedule.dayOfWeek - weekday(date) + 7) % 7);
  for (let count = 0; date <= end && occurrences.length < 6; count += 1, date = addDays(date, 7)) {
    const startsAt = makeIso(date, hour(schedule.startTime));
    const endsAt = makeIso(date, hour(schedule.endTime));
    if (new Date(startsAt).getTime() > now) {
      occurrences.push({ enrollment, schedule, originalDate: date, startsAt, endsAt, action: 'SCHEDULED' });
    }
    if (count > 550) break;
  }
  return occurrences;
}

function applyChange(occurrence: Occurrence, change: OccurrenceChange): Occurrence {
  if (change.action === 'CANCELLED') return { ...occurrence, action: 'CANCELLED' };
  return {
    ...occurrence,
    action: 'RESCHEDULED',
    startsAt: change.rescheduledStartsAt ?? occurrence.startsAt,
    endsAt: change.rescheduledEndsAt ?? occurrence.endsAt,
  };
}

export function MemberPrivateSchedulePage() {
  const enrollments = useMyPrivateEnrollments();
  const changeOccurrence = useChangePrivateOccurrence();
  const [now, setNow] = useState(() => Date.now());
  const [changes, setChanges] = useState<Record<string, OccurrenceChange>>({});
  const [target, setTarget] = useState<Occurrence | null>(null);
  const [action, setAction] = useState<'CANCELLED' | 'RESCHEDULED'>('CANCELLED');
  const [reason, setReason] = useState('');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [validationError, setValidationError] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (enrollments.isPending) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ListSkeleton label="Đang tải lịch khóa học…" /></div>;
  if (enrollments.isError) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} retrying={enrollments.isRefetching} pendingApi="GET /api/private-courses/enrollments" /></div>;

  const rawOccurrences = enrollments.data.flatMap((enrollment) => enrollment.schedules.flatMap((schedule) => nextOccurrences(enrollment, schedule, now)));
  const occurrences = rawOccurrences
    .map((occurrence) => {
      const saved = changes[occurrenceKey(occurrence.schedule.id, occurrence.originalDate)];
      return saved ? applyChange(occurrence, saved) : occurrence;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  const submit = async () => {
    if (!target || changeOccurrence.isPending) return;
    const cleanReason = reason.trim();
    if (!cleanReason) { setValidationError('Vui lòng nhập lý do.'); return; }
    if (action === 'RESCHEDULED' && !newStartsAt) { setValidationError('Chọn ngày giờ bắt đầu mới.'); return; }
    setValidationError('');
    try {
      const input = action === 'CANCELLED'
        ? { action, reason: cleanReason } as const
        : { action, newStartsAt: fromCenterDateTimeInput(newStartsAt), reason: cleanReason } as const;
      const result = await changeOccurrence.mutateAsync({
        enrollmentId: target.enrollment.id,
        scheduleId: target.schedule.id,
        sessionDate: target.originalDate,
        input,
      });
      setChanges((current) => ({ ...current, [occurrenceKey(target.schedule.id, target.originalDate)]: result }));
      setTarget(null);
      setReason('');
      setNewStartsAt('');
      toast(action === 'CANCELLED' ? 'Đã hủy occurrence này.' : 'Đã đổi lịch occurrence này.');
    } catch {
      // Mutation error state is shown in the dialog while preserving the entered values.
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader eyebrow="Lịch hội viên" title="Lịch khóa học 1–1 của tôi" description="Thao tác chỉ áp dụng cho một occurrence. Các buổi lặp ở tuần khác không bị thay đổi." />
      <Card className="mb-5 p-4"><p className="text-sm leading-relaxed text-ink"><strong>Chính sách 24 giờ:</strong> chỉ gửi yêu cầu hủy/đổi khi còn ít nhất 24 giờ trước buổi gốc. Backend kiểm tra điều kiện cuối cùng và có thể từ chối nếu đã quá hạn, đã hoàn thành hoặc occurrence đã được thay đổi.</p></Card>
      {occurrences.length === 0 ? (
        <EmptyState icon={<CalendarBlank />} title="Không có occurrence sắp tới" description="Lịch các buổi đã đăng ký sẽ xuất hiện tại đây khi enrollment đang hoạt động." />
      ) : (
        <div className="space-y-3">
          {occurrences.map((occurrence) => {
            const key = occurrenceKey(occurrence.schedule.id, occurrence.originalDate);
            const canChange = occurrence.action === 'SCHEDULED' &&
              new Date(occurrence.startsAt).getTime() - now >= 24 * 60 * 60 * 1000;
            return (
              <Card key={key} className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                <div className="min-w-[155px]"><p className="font-extrabold text-ink">{formatDate(occurrence.startsAt)}</p><p className="text-sm text-muted">{formatTime(occurrence.startsAt)}–{formatTime(occurrence.endsAt)}</p></div>
                <div className="min-w-0 flex-1"><p className="font-bold text-ink">{occurrence.enrollment.privateCourse.name}</p><p className="text-xs text-muted">{occurrence.enrollment.privateCourse.sport.name} · Coach {occurrence.enrollment.coach.user.displayName}{occurrence.schedule.room ? ` · ${occurrence.schedule.room.name}` : ''}</p>{occurrence.action === 'RESCHEDULED' && <p className="text-xs font-semibold text-accent-energy">Đổi từ buổi gốc {formatDate(occurrence.originalDate)}</p>}</div>
                <Chip tone={occurrence.action === 'CANCELLED' ? 'danger' : occurrence.action === 'RESCHEDULED' ? 'warning' : 'success'} dot>{occurrence.action === 'CANCELLED' ? 'Đã hủy' : occurrence.action === 'RESCHEDULED' ? 'Đã đổi lịch' : 'Đã lên lịch'}</Chip>
                {canChange && <Button size="sm" variant="secondary" onClick={() => { setTarget(occurrence); setAction('CANCELLED'); setReason(''); setNewStartsAt(''); setValidationError(''); changeOccurrence.reset(); }}>Đổi / hủy buổi này</Button>}
                {occurrence.action === 'SCHEDULED' && !canChange && <p className="text-xs text-muted">Còn dưới 24 giờ — không thể gửi yêu cầu đổi/hủy.</p>}
              </Card>
            );
          })}
        </div>
      )}
      <OccurrenceDialog
        target={target}
        action={action}
        reason={reason}
        newStartsAt={newStartsAt}
        loading={changeOccurrence.isPending}
        validationError={validationError}
        apiError={changeOccurrence.isError ? changeOccurrence.error : null}
        onAction={setAction}
        onReason={setReason}
        onNewStartsAt={setNewStartsAt}
        onCancel={() => { if (!changeOccurrence.isPending) { setTarget(null); changeOccurrence.reset(); } }}
        onSubmit={submit}
      />
    </div>
  );
}

function OccurrenceDialog({
  target,
  action,
  reason,
  newStartsAt,
  loading,
  validationError,
  apiError,
  onAction,
  onReason,
  onNewStartsAt,
  onCancel,
  onSubmit,
}: {
  target: Occurrence | null;
  action: 'CANCELLED' | 'RESCHEDULED';
  reason: string;
  newStartsAt: string;
  loading: boolean;
  validationError: string;
  apiError: unknown | null;
  onAction: (action: 'CANCELLED' | 'RESCHEDULED') => void;
  onReason: (value: string) => void;
  onNewStartsAt: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const errorMessage = apiError ? parseApiError(apiError).message : undefined;
  return (
    <Dialog
      open={target !== null}
      onClose={onCancel}
      title="Thay đổi một buổi học"
      description={target ? `${target.enrollment.privateCourse.name}, buổi gốc ngày ${formatDate(target.originalDate)}. Những buổi lặp khác không thay đổi.` : undefined}
      size="md"
      footer={<><Button variant="secondary" onClick={onCancel} disabled={loading}>Đóng</Button><Button variant={action === 'CANCELLED' ? 'danger' : 'primary'} onClick={onSubmit} loading={loading}>{action === 'CANCELLED' ? 'Xác nhận hủy buổi' : 'Xác nhận đổi buổi'}</Button></>}
    >
      <div className="space-y-4">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-[13px] font-bold text-ink">Thao tác cho occurrence này</legend>
          <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border text-sm font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${action === 'CANCELLED' ? 'border-primary bg-primary text-white' : 'border-line bg-surface'}`}><input className="sr-only" type="radio" name="occurrenceAction" checked={action === 'CANCELLED'} onChange={() => onAction('CANCELLED')} />Hủy buổi</label>
          <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border text-sm font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${action === 'RESCHEDULED' ? 'border-primary bg-primary text-white' : 'border-line bg-surface'}`}><input className="sr-only" type="radio" name="occurrenceAction" checked={action === 'RESCHEDULED'} onChange={() => onAction('RESCHEDULED')} />Đổi lịch buổi</label>
        </fieldset>
        {action === 'RESCHEDULED' && <Field id="occurrence-new-start" label="Giờ bắt đầu mới" required error={validationError.includes('bắt đầu mới') ? validationError : undefined} hint="Thời lượng hiện tại được giữ nguyên. Phòng hiện tại sẽ được giữ; không gửi newRoomId."><input id="occurrence-new-start" type="datetime-local" className={inputClass} value={newStartsAt} onChange={(event) => onNewStartsAt(event.target.value)} aria-invalid={Boolean(validationError.includes('bắt đầu mới'))} /></Field>}
        <Field id="occurrence-reason" label="Lý do" required error={validationError.includes('lý do') ? validationError : undefined}><textarea id="occurrence-reason" className={textareaClass} value={reason} onChange={(event) => onReason(event.target.value)} aria-invalid={Boolean(validationError.includes('lý do'))} /></Field>
        {validationError && !validationError.includes('lý do') && !validationError.includes('ngày giờ') && <InlineAlert>{validationError}</InlineAlert>}
        {apiError !== null && <InlineAlert>{errorMessage}</InlineAlert>}
      </div>
    </Dialog>
  );
}
