import { CalendarBlank, Certificate, Clock, Plus, Trash } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { toast } from '../../../components/feedback/toast';
import { useMyProfile } from '../../profile/hooks/useMyProfile';
import { getSports } from '../../training/api';
import { Button, ButtonLink } from '../../training/components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { ConfirmDialog, Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { addDays, formatDate, formatDateTime, formatTime, todayInCenter } from '../../training/format';
import { parseApiError, retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { useCoaches, useCoachAvailability, useCoachSchedule, useCoachSports, useAssignCoachSport, useDeleteAvailability, useRemoveCoachSport, useSaveAvailability } from '../hooks/useCoachManagement';
import type { AvailabilityInput, CoachAvailability, CoachScheduleItem } from '../types';
import { isCoachScheduleRangeValid } from '../scheduleRange';
import { z } from 'zod';

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const availabilitySchema = z
  .object({
    dayOfWeek: z.string().regex(/^[0-6]$/, 'Vui lòng chọn thứ trong tuần.'),
    startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Nhập giờ theo định dạng HH:mm.'),
    endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Nhập giờ theo định dạng HH:mm.'),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vui lòng chọn ngày bắt đầu hiệu lực.'),
    effectiveTo: z.string(),
  })
  .refine((value) => value.startTime < value.endTime, {
    path: ['endTime'],
    message: 'Giờ kết thúc phải sau giờ bắt đầu.',
  })
  .refine((value) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, {
    path: ['effectiveTo'],
    message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',
  });

type AvailabilityValues = z.infer<typeof availabilitySchema>;

const timeValue = (value: string) => value.slice(11, 16);
const dateValue = (value: string | null) => value?.slice(0, 10) ?? '';
const errorText = (error: unknown) => parseApiError(error).message;

export function CoachManagementListPage() {
  const coaches = useCoaches();
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader eyebrow="Nhân sự" title="Quản lý Coach" description="Xem và cập nhật chuyên môn, availability và lịch dạy của Coach." />
      {coaches.isPending ? (
        <ListSkeleton label="Đang tải danh sách Coach…" />
      ) : coaches.isError ? (
        <ErrorState error={coaches.error} onRetry={() => coaches.refetch()} retrying={coaches.isRefetching} pendingApi="GET /api/staff?role=COACH" />
      ) : coaches.data.length === 0 ? (
        <EmptyState icon={<Certificate />} title="Chưa có Coach" description="Tạo Coach trong mục Quản lý nhân sự trước khi quản lý chuyên môn và lịch." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coaches.data.map((coach) => (
            <Card key={coach.id} className="p-5">
              <p className="text-lg font-extrabold text-ink">{coach.displayName}</p>
              <p className="mt-1 text-sm text-muted">{coach.staffCode ?? coach.email}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Chip tone={coach.coachStatus === 'ACTIVE' ? 'success' : 'neutral'} dot>
                  {coach.coachStatus === 'ACTIVE' ? 'Đang hoạt động' : coach.coachStatus ?? coach.status}
                </Chip>
                <ButtonLink to={`/app/coaches/${coach.id}`} size="sm">Mở hồ sơ</ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function CoachManagementPage() {
  const { coachId: rawCoachId } = useParams();
  const coachId = Number(rawCoachId);
  const coaches = useCoaches();
  const coach = coaches.data?.find((item) => item.id === coachId);

  if (!Number.isInteger(coachId) || coachId <= 0) {
    return <ErrorState error={new Error('ID Coach không hợp lệ.')} />;
  }
  if (coaches.isPending) return <ListSkeleton label="Đang tải hồ sơ Coach…" />;
  if (coaches.isError) return <ErrorState error={coaches.error} onRetry={() => coaches.refetch()} retrying={coaches.isRefetching} />;
  if (!coach) return <EmptyState icon={<Certificate />} title="Không tìm thấy Coach" description="Coach có thể đã bị xóa hoặc không còn trong danh sách nhân sự." />;

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Hồ sơ Coach"
        title={coach.displayName}
        description={`${coach.staffCode ?? coach.email} · ${coach.coachStatus ?? coach.status}`}
        back={<ButtonLink to="/app/coaches" className="mb-3">← Danh sách Coach</ButtonLink>}
      />
      <CoachProfileContent coachId={coachId} manager coachName={coach.displayName} />
    </div>
  );
}

export function CoachOwnSchedulePage() {
  const profile = useMyProfile();
  if (profile.isPending) return <ListSkeleton label="Đang tải hồ sơ Coach…" />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isRefetching} pendingApi="GET /api/users/me" />;
  if (profile.data.role !== 'COACH' || !profile.data.coach) {
    return <ErrorState error={new Error('Hồ sơ đăng nhập không phải tài khoản Coach.')} />;
  }
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader eyebrow="Lịch Coach" title="Lịch dạy của tôi" description="Lịch lớp nhóm và từng occurrence khóa học 1–1 được gộp từ backend." />
      <CoachProfileContent coachId={profile.data.id} manager={false} coachName={profile.data.displayName} />
    </div>
  );
}

function CoachProfileContent({ coachId, manager, coachName }: { coachId: number; manager: boolean; coachName: string }) {
  const role = getSessionRole();
  const canManage = manager && role === 'CENTER_MANAGER';
  const sports = useCoachSports(coachId);
  const availability = useCoachAvailability(coachId);
  const [sportId, setSportId] = useState('');
  const [availabilityTarget, setAvailabilityTarget] = useState<CoachAvailability | null | undefined>();
  const [removeSport, setRemoveSport] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachAvailability | null>(null);
  const addSportMutation = useAssignCoachSport(coachId);
  const removeSportMutation = useRemoveCoachSport(coachId);
  const deleteAvailability = useDeleteAvailability(coachId);
  const activeSports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: retryServerErrors });
  const coachSchedule = <CoachSchedulePanel coachId={coachId} coachName={coachName} />;

  const handleAddSport = async () => {
    if (!sportId || addSportMutation.isPending) return;
    try {
      await addSportMutation.mutateAsync(Number(sportId));
      setSportId('');
      toast('Đã thêm môn chuyên môn cho Coach.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  };

  const handleRemoveSport = async () => {
    if (removeSport === null || removeSportMutation.isPending) return;
    try {
      await removeSportMutation.mutateAsync(removeSport);
      setRemoveSport(null);
      toast('Đã gỡ môn chuyên môn khỏi hồ sơ Coach.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  };

  const handleDeleteAvailability = async () => {
    if (!deleteTarget || deleteAvailability.isPending) return;
    try {
      await deleteAvailability.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast('Đã ngừng khung giờ khả dụng.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  };

  const availableSports = activeSports.data?.filter((sport) => !sports.data?.some((assigned) => assigned.id === sport.id)) ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Môn chuyên môn"
          description="Danh sách môn được cấp cho Coach; chỉ môn đang hoạt động có thể được gán mới."
          actions={canManage ? (
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor={`sport-${coachId}`}>Chọn môn chuyên môn</label>
              <select id={`sport-${coachId}`} className={`${inputClass} min-w-48`} value={sportId} onChange={(event) => setSportId(event.target.value)} disabled={activeSports.isPending || sports.isPending}>
                <option value="">Chọn môn đang hoạt động</option>
                {availableSports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
              </select>
              <Button onClick={handleAddSport} loading={addSportMutation.isPending} disabled={!sportId || activeSports.isError || sports.isError} icon={<Plus aria-hidden="true" />}>Gán môn</Button>
            </div>
          ) : undefined}
        />
        {sports.isPending ? (
          <ListSkeleton rows={2} label="Đang tải môn chuyên môn…" />
        ) : sports.isError ? (
          <ErrorState compact error={sports.error} onRetry={() => sports.refetch()} retrying={sports.isRefetching} pendingApi="GET /api/coaches/:id/sports" />
        ) : sports.data.length === 0 ? (
          <EmptyState compact icon={<Certificate />} title="Chưa có môn chuyên môn" description="Coach chưa được gán môn thể thao nào." />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {sports.data.map((sport) => (
              <li key={sport.id} className="flex items-center gap-2 rounded-full bg-primary/8 px-3 py-2 text-sm font-bold text-primary-deep">
                {sport.name}
                {canManage && <button type="button" className="rounded-full p-1 hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Gỡ ${sport.name}`} onClick={() => setRemoveSport(sport.id)}><Trash aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
        )}
        {activeSports.isError && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-danger" role="alert"><span>Không tải được danh sách môn thể thao: {errorText(activeSports.error)}</span><Button size="sm" variant="secondary" onClick={() => activeSports.refetch()} loading={activeSports.isRefetching}>Tải lại môn</Button></div>}
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Availability"
          description="Các khung giờ lặp theo thứ trong tuần và khoảng ngày hiệu lực."
          actions={canManage ? <Button icon={<Plus aria-hidden="true" />} onClick={() => setAvailabilityTarget(null)}>Thêm khung giờ</Button> : undefined}
        />
        {availability.isPending ? (
          <ListSkeleton rows={3} label="Đang tải availability…" />
        ) : availability.isError ? (
          <ErrorState compact error={availability.error} onRetry={() => availability.refetch()} retrying={availability.isRefetching} pendingApi="GET /api/coaches/:id/availability" />
        ) : availability.data.length === 0 ? (
          <EmptyState compact icon={<Clock />} title="Chưa có khung giờ" description="Coach hiện chưa có availability được khai báo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[690px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted"><tr><th className="py-2 pr-3">Thứ</th><th className="py-2 pr-3">Giờ</th><th className="py-2 pr-3">Hiệu lực</th><th className="py-2 pr-3">Trạng thái</th>{canManage && <th className="py-2 text-right">Thao tác</th>}</tr></thead>
              <tbody className="divide-y divide-line">
                {availability.data.map((slot) => (
                  <tr key={slot.id}>
                    <td className="py-3 pr-3 font-semibold">{WEEKDAYS[slot.dayOfWeek] ?? `Thứ ${slot.dayOfWeek}`}</td>
                    <td className="py-3 pr-3">{timeValue(slot.startTime)}–{timeValue(slot.endTime)}</td>
                    <td className="py-3 pr-3">{formatDate(slot.effectiveFrom)} – {slot.effectiveTo ? formatDate(slot.effectiveTo) : 'Không giới hạn'}</td>
                    <td className="py-3 pr-3"><Chip tone={slot.status === 'AVAILABLE' ? 'success' : 'neutral'} dot>{slot.status === 'AVAILABLE' ? 'Đang khả dụng' : 'Đã ngừng'}</Chip></td>
                    {canManage && <td className="py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={slot.status !== 'AVAILABLE'} onClick={() => setAvailabilityTarget(slot)}>Sửa</Button><Button size="sm" variant="danger" disabled={slot.status !== 'AVAILABLE'} onClick={() => setDeleteTarget(slot)}>Ngừng</Button></div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {coachSchedule}

      {availabilityTarget !== undefined && (
        <AvailabilityFormDialog
          coachId={coachId}
          availability={availabilityTarget}
          onClose={() => setAvailabilityTarget(undefined)}
        />
      )}
      <ConfirmDialog
        open={removeSport !== null}
        title="Gỡ môn chuyên môn?"
        description="Coach sẽ không còn được xác nhận có chuyên môn cho môn này. Bạn có thể gán lại sau."
        confirmLabel="Gỡ chuyên môn"
        tone="danger"
        loading={removeSportMutation.isPending}
        error={removeSportMutation.isError && <InlineAlert>{errorText(removeSportMutation.error)}</InlineAlert>}
        onCancel={() => setRemoveSport(null)}
        onConfirm={handleRemoveSport}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Ngừng khung giờ availability?"
        description="Khung giờ sẽ được đánh dấu ngừng; thông tin lịch sử vẫn được giữ lại."
        confirmLabel="Ngừng availability"
        tone="danger"
        loading={deleteAvailability.isPending}
        error={deleteAvailability.isError && <InlineAlert>{errorText(deleteAvailability.error)}</InlineAlert>}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAvailability}
      />
    </div>
  );
}

function AvailabilityFormDialog({
  coachId,
  availability,
  onClose,
}: {
  coachId: number;
  availability: CoachAvailability | null;
  onClose: () => void;
}) {
  const save = useSaveAvailability(coachId);
  const form = useForm<AvailabilityValues>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: availability
      ? {
          dayOfWeek: String(availability.dayOfWeek),
          startTime: timeValue(availability.startTime),
          endTime: timeValue(availability.endTime),
          effectiveFrom: dateValue(availability.effectiveFrom),
          effectiveTo: dateValue(availability.effectiveTo),
        }
      : { dayOfWeek: '', startTime: '', endTime: '', effectiveFrom: todayInCenter(), effectiveTo: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    const input: AvailabilityInput = {
      dayOfWeek: Number(values.dayOfWeek),
      startTime: values.startTime,
      endTime: values.endTime,
      effectiveFrom: values.effectiveFrom,
      ...(values.effectiveTo ? { effectiveTo: values.effectiveTo } : {}),
    };
    try {
      await save.mutateAsync({ availabilityId: availability?.id, input });
      toast(availability ? 'Đã cập nhật availability.' : 'Đã thêm availability.');
      onClose();
    } catch (error) {
      form.setError('root.server', { message: errorText(error) });
    }
  });

  const field = (name: keyof AvailabilityValues) => form.formState.errors[name]?.message;
  const closeWhenIdle = () => {
    if (!save.isPending) onClose();
  };
  return (
    <Dialog
      open
      onClose={closeWhenIdle}
      title={availability ? 'Sửa availability' : 'Thêm availability'}
      description="Thời gian sử dụng giờ trung tâm; ngày trong tuần theo quy ước Chủ nhật = 0."
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={save.isPending}>Đóng</Button><Button onClick={submit} loading={save.isPending}>{availability ? 'Lưu thay đổi' : 'Thêm khung giờ'}</Button></>}
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="availability-day" label="Thứ trong tuần" required error={field('dayOfWeek')}>
          <select id="availability-day" className={inputClass} aria-invalid={Boolean(field('dayOfWeek'))} {...form.register('dayOfWeek')}>
            <option value="">Chọn thứ</option>{WEEKDAYS.map((day, value) => <option key={day} value={value}>{day}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="availability-start" label="Giờ bắt đầu" required error={field('startTime')}><input id="availability-start" type="time" className={inputClass} aria-invalid={Boolean(field('startTime'))} {...form.register('startTime')} /></Field>
          <Field id="availability-end" label="Giờ kết thúc" required error={field('endTime')}><input id="availability-end" type="time" className={inputClass} aria-invalid={Boolean(field('endTime'))} {...form.register('endTime')} /></Field>
          <Field id="availability-from" label="Ngày bắt đầu hiệu lực" required error={field('effectiveFrom')}><input id="availability-from" type="date" className={inputClass} aria-invalid={Boolean(field('effectiveFrom'))} {...form.register('effectiveFrom')} /></Field>
          <Field id="availability-to" label="Ngày kết thúc hiệu lực" error={field('effectiveTo')} hint="Để trống nếu không có ngày kết thúc."><input id="availability-to" type="date" className={inputClass} aria-invalid={Boolean(field('effectiveTo'))} {...form.register('effectiveTo')} /></Field>
        </div>
        {form.formState.errors.root?.server?.message && <InlineAlert>{form.formState.errors.root.server.message}</InlineAlert>}
        <button type="submit" className="sr-only" disabled={save.isPending}>Lưu availability</button>
      </form>
    </Dialog>
  );
}

function CoachSchedulePanel({ coachId, coachName }: { coachId: number; coachName: string }) {
  const today = todayInCenter();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 30));
  const rangeValid = isCoachScheduleRangeValid(from, to);
  const schedule = useCoachSchedule(coachId, from, to, rangeValid);

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading title="Lịch tổng hợp Coach" description={`${coachName}: lớp nhóm và từng buổi khóa học 1–1 theo response từ API.`} />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-[13px] font-bold text-ink">Từ ngày<input className={`${inputClass} mt-1.5`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="text-[13px] font-bold text-ink">Đến ngày<input className={`${inputClass} mt-1.5`} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <p className="self-end pb-2 text-xs text-muted">Tối đa 90 ngày mỗi lần truy vấn.</p>
      </div>
      {!rangeValid ? (
        <InlineAlert>Chọn ngày bắt đầu/kết thúc hợp lệ; khoảng ngày tối đa là 90 ngày.</InlineAlert>
      ) : schedule.isPending ? (
        <ListSkeleton rows={4} label="Đang tải lịch Coach…" />
      ) : schedule.isError ? (
        <ErrorState compact error={schedule.error} onRetry={() => schedule.refetch()} retrying={schedule.isRefetching} pendingApi="GET /api/coaches/:id/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD" />
      ) : schedule.data.length === 0 ? (
        <EmptyState compact icon={<CalendarBlank />} title="Không có buổi học trong khoảng ngày này" description="Thử chọn khoảng ngày khác." />
      ) : (
        <ul className="divide-y divide-line">
          {schedule.data.map((item) => <li key={`${item.type}-${item.id}-${item.startsAt}`}><ScheduleItem item={item} /></li>)}
        </ul>
      )}
    </Card>
  );
}

function ScheduleItem({ item }: { item: CoachScheduleItem }) {
  const privateCourse = item.type === 'PRIVATE_COURSE';
  const typeLabel = privateCourse ? 'Khóa 1–1' : 'Lớp nhóm';
  const name = privateCourse ? item.enrollment.privateCourse.name : item.groupClass.name;
  const statusLabel = item.status === 'SCHEDULED' ? 'Đã lên lịch' : item.status === 'CANCELLED' ? 'Đã hủy' : item.status === 'RESCHEDULED' ? 'Đã dời lịch' : 'Đã hoàn thành';
  const tone = item.status === 'CANCELLED' ? 'danger' : item.status === 'RESCHEDULED' ? 'warning' : item.status === 'COMPLETED' ? 'neutral' : 'success';
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="w-28 shrink-0 text-sm"><p className="font-extrabold text-ink">{formatTime(item.startsAt)}–{formatTime(item.endsAt)}</p><p className="text-xs text-muted">{formatDateTime(item.startsAt).split(' ')[0]}</p></div>
      <div className="min-w-0 flex-1"><p className="truncate font-bold text-ink">{name}</p><p className="text-xs text-muted">{typeLabel}{item.room ? ` · ${item.room.name}` : ''}{privateCourse ? ` · ${item.enrollment.member.user.displayName}` : ''}{privateCourse && item.status === 'RESCHEDULED' ? ` · Buổi gốc ${formatDate(item.originalDate)}` : ''}</p></div>
      <Chip tone={tone} dot>{statusLabel}</Chip>
    </div>
  );
}
