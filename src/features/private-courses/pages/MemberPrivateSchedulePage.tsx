import { ArrowRight, CalendarBlank, CalendarCheck, Clock, CurrencyCircleDollar, MapPin, Receipt, ShieldCheck, UsersThree } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { addDays, formatDate, formatDateTime, formatTime, fromCenterDateTimeInput, todayInCenter } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { useMyClassRegistrations } from '../../member/bookingHooks';
import type { MyClassRegistration } from '../../member/bookingTypes';
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

type GroupOccurrence = {
  registration: MyClassRegistration;
  session: MyClassRegistration['groupClass']['sessions'][number];
  startsAt: string;
  endsAt: string;
};

type TimelineItem =
  | { kind: 'PRIVATE'; occurrence: Occurrence; startsAt: string }
  | { kind: 'GROUP'; occurrence: GroupOccurrence; startsAt: string };

const money = (value: string | number) => `${new Intl.NumberFormat('vi-VN').format(Number(value))} ₫`;

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
  const classRegistrations = useMyClassRegistrations();
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

  if (enrollments.isPending || classRegistrations.isPending) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ListSkeleton label="Đang tải lịch học của bạn…" /></div>;
  if (enrollments.isError) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} retrying={enrollments.isRefetching} pendingApi="GET /api/private-courses/enrollments" /></div>;
  if (classRegistrations.isError) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ErrorState error={classRegistrations.error} onRetry={() => classRegistrations.refetch()} retrying={classRegistrations.isRefetching} pendingApi="GET /api/bookings/registrations/me" /></div>;

  const rawOccurrences = enrollments.data.flatMap((enrollment) => enrollment.schedules.flatMap((schedule) => nextOccurrences(enrollment, schedule, now)));
  const occurrences = rawOccurrences
    .map((occurrence) => {
      const saved = changes[occurrenceKey(occurrence.schedule.id, occurrence.originalDate)];
      return saved ? applyChange(occurrence, saved) : occurrence;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const pendingRegistrations = classRegistrations.data.filter((registration) => registration.status === 'PENDING_PAYMENT');
  const groupOccurrences: GroupOccurrence[] = classRegistrations.data
    .filter((registration) => registration.status === 'CONFIRMED')
    .flatMap((registration) => registration.groupClass.sessions
      .filter((session) => new Date(session.endsAt).getTime() > now)
      .map((session) => ({ registration, session, startsAt: session.startsAt, endsAt: session.endsAt })));
  const timeline: TimelineItem[] = [
    ...occurrences.map((occurrence): TimelineItem => ({ kind: 'PRIVATE', occurrence, startsAt: occurrence.startsAt })),
    ...groupOccurrences.map((occurrence): TimelineItem => ({ kind: 'GROUP', occurrence, startsAt: occurrence.startsAt })),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

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
    <div className="member-schedule-hub">
      <section className="schedule-hub-hero">
        <div className="schedule-hub-hero__copy">
          <h1>Lịch học của tôi</h1>
          <p>Mọi lớp nhóm, khóa huấn luyện 1–1 và khoản thanh toán cần hoàn tất trong cùng một lịch trình.</p>
        </div>
        <div className="schedule-hub-stats" aria-label="Tổng quan lịch học">
          <span><CalendarCheck /><b>{timeline.length} buổi</b> sắp tới</span>
          <span><Receipt /><b>{pendingRegistrations.length} đăng ký</b> cần xử lý</span>
          <span><ShieldCheck />Đổi hoặc hủy 1–1 trước <b>24 giờ</b></span>
        </div>
      </section>
      {pendingRegistrations.length > 0 && (
        <section className="schedule-action-zone" aria-labelledby="pending-payment-heading">
          <div className="schedule-section-heading"><div><h2 id="pending-payment-heading">Đăng ký cần hoàn tất</h2><p>Thanh toán trước thời hạn để giữ chỗ và đưa các buổi học vào lịch.</p></div><Chip tone="warning">{pendingRegistrations.length} cần xử lý</Chip></div>
          <div className="pending-registration-list">
            {pendingRegistrations.map((registration) => (
              <article key={registration.id} className="pending-registration">
                <div className="pending-registration__identity"><h3>{registration.groupClass.name}</h3><p>{registration.groupClass.sport.name} · Lớp nhóm · Coach {registration.groupClass.coach.user.displayName}</p></div>
                <div className="pending-registration__detail"><CurrencyCircleDollar /><span>Học phí</span><strong>{money(registration.order?.finalAmount ?? registration.price)}</strong></div>
                <div className="pending-registration__detail"><Clock /><span>Giữ chỗ đến</span><strong>{registration.order?.expiresAt ? formatDateTime(registration.order.expiresAt) : 'Theo thời hạn đơn'}</strong></div>
                <div className="pending-registration__action"><small>{registration.order?.orderNumber ?? `Đăng ký #${registration.id}`}</small>{registration.order && <ButtonLink size="sm" to={`/member/payments?orderId=${registration.order.id}`}>Thanh toán ngay <ArrowRight /></ButtonLink>}</div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="schedule-timeline-section">
      <div className="schedule-section-heading"><div><h2>Buổi học sắp tới</h2><p>Lịch đã xác nhận, sắp xếp theo thời gian gần nhất.</p></div>{timeline.length > 0 && <Chip tone="success">{timeline.length} buổi</Chip>}</div>
      {timeline.length === 0 ? (
        <EmptyState icon={<CalendarBlank />} title="Chưa có buổi học sắp tới" description={pendingRegistrations.length ? 'Hoàn tất thanh toán các đăng ký phía trên để xác nhận lịch học.' : 'Các buổi lớp nhóm và khóa 1–1 đã xác nhận sẽ xuất hiện tại đây.'} />
      ) : (
        <div className="schedule-timeline">
          {timeline.map((item) => {
            if (item.kind === 'GROUP') {
              const { registration, session } = item.occurrence;
              return (
                <article key={`group-${session.id}`} className="schedule-timeline-item">
                  <time><b>{formatTime(session.startsAt)}</b><span>{formatDate(session.startsAt)}</span><small>đến {formatTime(session.endsAt)}</small></time>
                  <div className="schedule-timeline-item__marker"><UsersThree /></div>
                  <div className="schedule-timeline-item__content"><div><Chip tone="success" dot>Lớp nhóm</Chip><h3>{registration.groupClass.name}</h3><p>{registration.groupClass.sport.name} · Coach {registration.groupClass.coach.user.displayName}</p></div>{session.room && <span className="schedule-location"><MapPin /> {session.room.name}</span>}</div>
                </article>
              );
            }
            const occurrence = item.occurrence;
            const key = occurrenceKey(occurrence.schedule.id, occurrence.originalDate);
            const canChange = occurrence.action === 'SCHEDULED' &&
              new Date(occurrence.startsAt).getTime() - now >= 24 * 60 * 60 * 1000;
            return (
              <article key={key} className={`schedule-timeline-item ${occurrence.action === 'CANCELLED' ? 'is-cancelled' : ''}`}>
                <time><b>{formatTime(occurrence.startsAt)}</b><span>{formatDate(occurrence.startsAt)}</span><small>đến {formatTime(occurrence.endsAt)}</small></time>
                <div className="schedule-timeline-item__marker"><CalendarBlank /></div>
                <div className="schedule-timeline-item__content"><div><Chip tone={occurrence.action === 'CANCELLED' ? 'danger' : occurrence.action === 'RESCHEDULED' ? 'warning' : 'success'} dot>{occurrence.action === 'CANCELLED' ? 'Đã hủy' : occurrence.action === 'RESCHEDULED' ? 'Đã đổi lịch' : 'Khóa 1–1'}</Chip><h3>{occurrence.enrollment.privateCourse.name}</h3><p>{occurrence.enrollment.privateCourse.sport.name} · Coach {occurrence.enrollment.coach.user.displayName}</p>{occurrence.action === 'RESCHEDULED' && <small>Đổi từ buổi gốc {formatDate(occurrence.originalDate)}</small>}</div><div className="schedule-timeline-item__tools">{occurrence.schedule.room && <span className="schedule-location"><MapPin /> {occurrence.schedule.room.name}</span>}{canChange && <Button size="sm" variant="secondary" onClick={() => { setTarget(occurrence); setAction('CANCELLED'); setReason(''); setNewStartsAt(''); setValidationError(''); changeOccurrence.reset(); }}>Đổi / hủy buổi này</Button>}{occurrence.action === 'SCHEDULED' && !canChange && <span className="schedule-cutoff">Đã qua hạn đổi/hủy</span>}</div></div>
              </article>
            );
          })}
        </div>
      )}
      <div className="schedule-policy-note"><ShieldCheck /><p><strong>Lưu ý về thay đổi lịch:</strong> khóa 1–1 chỉ nhận yêu cầu đổi hoặc hủy trước buổi gốc ít nhất 24 giờ. Lớp nhóm áp dụng chính sách hủy riêng của lớp.</p></div>
      </section>
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
