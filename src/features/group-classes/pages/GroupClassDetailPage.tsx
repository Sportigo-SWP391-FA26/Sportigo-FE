import { CalendarBlank, Check, Clock, PencilSimple, Plus, WarningCircle } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { getSports } from '../../training/api';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { fromCenterDateTimeInput, formatDateTime, toCenterDateTimeInput } from '../../training/format';
import { parseApiError, retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { WeeklyTimetable } from '../../../components/schedule/WeeklyTimetable';
import { useCoachAvailability, useCoachSchedule, useQualifiedCoaches } from '../../coaches/hooks/useCoachManagement';
import { useRooms } from '../../catalog/hooks';
import { useGroupClassSessions, useGroupClasses, useCancelClassSession, useChangeClassSession, useCreateClassSession, useCreateRecurringClassSessions, usePreviewRecurringClassSessions, useUpdateGroupClass, useUpdateGroupClassStatus } from '../hooks/useGroupClasses';
import type { CreateRecurringSessionsInput, GroupClass } from '../types';

const editSchema = z
  .object({
    sportId: z.string().min(1, 'Chọn môn thể thao.'),
    coachId: z.string().min(1, 'Chọn Coach.'),
    name: z.string().trim().min(1, 'Tên lớp không được để trống.'),
    description: z.string(),
    capacity: z.string().regex(/^[1-9]\d*$/, 'Sức chứa phải là số nguyên dương.'),
    tuitionFee: z.string().regex(/^(?:\d+)(?:\.\d{1,2})?$/, 'Học phí phải là số không âm.'),
    registrationOpenAt: z.string().min(1, 'Nhập thời gian mở đăng ký.'),
    registrationCloseAt: z.string().min(1, 'Nhập thời gian đóng đăng ký.'),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu lớp.'),
    endDate: z.string().min(1, 'Chọn ngày kết thúc lớp.'),
  })
  .superRefine((values, context) => {
    if (values.registrationOpenAt >= values.registrationCloseAt) {
      context.addIssue({ code: 'custom', path: ['registrationCloseAt'], message: 'Thời gian đóng đăng ký phải sau thời gian mở.' });
    }
    if (values.registrationCloseAt.slice(0, 10) > values.startDate) {
      context.addIssue({ code: 'custom', path: ['registrationCloseAt'], message: 'Đóng đăng ký không được sau ngày bắt đầu lớp.' });
    }
    if (values.startDate > values.endDate) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'Ngày kết thúc lớp phải bằng hoặc sau ngày bắt đầu.' });
    }
  });

type EditValues = z.infer<typeof editSchema>;
type SessionTarget = { id: number; title: string } | null;
type ChangeTarget = { id: number; startsAt: string; roomId: number } | null;
const errorText = (error: unknown) => parseApiError(error).message;

function initialValues(groupClass: GroupClass): EditValues {
  return {
    sportId: String(groupClass.sportId),
    coachId: String(groupClass.coachId),
    name: groupClass.name,
    description: groupClass.description ?? '',
    capacity: String(groupClass.capacity),
    tuitionFee: String(groupClass.tuitionFee),
    registrationOpenAt: toCenterDateTimeInput(groupClass.registrationOpenAt),
    registrationCloseAt: toCenterDateTimeInput(groupClass.registrationCloseAt),
    startDate: groupClass.startDate.slice(0, 10),
    endDate: groupClass.endDate.slice(0, 10),
  };
}

export function GroupClassDetailPage() {
  const classId = Number(useParams().classId);
  const [searchParams] = useSearchParams();
  const classes = useGroupClasses();
  const sessions = useGroupClassSessions(classId);
  const [editing, setEditing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SessionTarget>(null);
  const [changeTarget, setChangeTarget] = useState<ChangeTarget>(null);
  const [creatingSession, setCreatingSession] = useState<'single' | 'recurring' | null>(() => searchParams.get('schedule') === '1' ? 'recurring' : null);
  const groupClass = classes.data?.find((item) => item.id === classId);
  const cancel = useCancelClassSession(classId);
  const updateStatus = useUpdateGroupClassStatus();

  if (!Number.isInteger(classId) || classId <= 0) return <ErrorState error={new Error('ID lớp học không hợp lệ.')} />;
  if (classes.isPending) return <ListSkeleton label="Đang tải chi tiết lớp…" />;
  if (classes.isError) return <ErrorState error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isRefetching} pendingApi="GET /api/group-classes" />;
  if (!groupClass) return <EmptyState icon={<CalendarBlank />} title="Không tìm thấy lớp học" description="Lớp có thể đã bị xóa hoặc không còn trong danh sách quản trị." />;

  const cancelSession = async (reason: string) => {
    if (!cancelTarget || cancel.isPending) return;
    try {
      await cancel.mutateAsync({ sessionId: cancelTarget.id, reason });
      setCancelTarget(null);
      toast('Đã hủy riêng buổi học.');
    } catch {
      // Lỗi được hiển thị trong hộp thoại để giữ nguyên lý do đã nhập.
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Lớp nhóm"
        title={groupClass.name}
        description={`${groupClass.sport.name} · Coach ${groupClass.coach.user.displayName} · ${groupClass.status}`}
        back={<ButtonLink to="/app/classes" className="mb-3">← Danh sách lớp</ButtonLink>}
        actions={<div className="flex flex-wrap gap-2">
          {groupClass.status === 'DRAFT' && <Button onClick={() => updateStatus.mutate({ classId, status: 'OPEN' })} loading={updateStatus.isPending}>Mở đăng ký</Button>}
          {groupClass.status === 'OPEN' && <Button variant="secondary" onClick={() => updateStatus.mutate({ classId, status: 'CLOSED' })} loading={updateStatus.isPending}>Đóng đăng ký</Button>}
          {groupClass.status === 'CLOSED' && <Button onClick={() => updateStatus.mutate({ classId, status: 'OPEN' })} loading={updateStatus.isPending}>Mở lại đăng ký</Button>}
          <Button icon={<PencilSimple aria-hidden="true" />} onClick={() => setEditing(true)}>Sửa thông tin lớp</Button>
        </div>}
      />
      {updateStatus.isError && <div className="mb-4"><InlineAlert>{errorText(updateStatus.error)}</InlineAlert></div>}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs font-bold text-muted">Sức chứa</p><p className="mt-1 text-lg font-extrabold">{groupClass.capacity}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Học phí</p><p className="mt-1 text-lg font-extrabold">{new Intl.NumberFormat('vi-VN').format(Number(groupClass.tuitionFee))} ₫</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Đăng ký</p><p className="mt-1 text-sm font-bold">{formatDateTime(groupClass.registrationOpenAt)} – {formatDateTime(groupClass.registrationCloseAt)}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Thời gian lớp</p><p className="mt-1 text-sm font-bold">{groupClass.startDate.slice(0, 10)} – {groupClass.endDate.slice(0, 10)}</p></Card>
      </div>
      {groupClass.description && <Card className="mb-6 p-5"><h2 className="font-extrabold">Mô tả</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{groupClass.description}</p></Card>}

      <Card className="p-5 sm:p-6">
        <SectionHeading title="Các buổi học" description="Hủy hoặc đổi ở đây chỉ áp dụng cho buổi đã chọn, không thay đổi toàn bộ lớp."
          actions={<div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" icon={<Plus aria-hidden="true" />} onClick={() => setCreatingSession('single')}>Thêm buổi</Button><Button size="sm" variant="secondary" onClick={() => setCreatingSession('recurring')}>Tạo lịch lặp</Button></div>} />
        {sessions.isPending ? (
          <ListSkeleton rows={4} label="Đang tải các buổi học…" />
        ) : sessions.isError ? (
          <ErrorState compact error={sessions.error} onRetry={() => sessions.refetch()} retrying={sessions.isRefetching} pendingApi="GET /api/group-classes/:id/sessions" />
        ) : (
          <div className="space-y-3">
            {sessions.data.length === 0 && <InlineAlert>Lớp chưa có buổi học. Chọn “Tạo lịch lặp” để xếp ca theo availability đã duyệt của Coach.</InlineAlert>}
            <WeeklyTimetable emptyText="Chưa có buổi học" items={sessions.data.map((session) => ({
            id: session.id,
            dayOfWeek: new Date(session.startsAt).getDay(),
            date: session.startsAt,
            time: `${formatDateTime(session.startsAt).split(' ')[1]}–${formatDateTime(session.endsAt).split(' ')[1]}`,
            title: formatDateTime(session.startsAt).split(' ')[0],
            subtitle: `${session.room?.name ?? 'Chưa có phòng'}${session.note ? ` · ${session.note}` : ''}`,
            tone: session.status === 'CANCELLED' ? 'danger' as const : session.status === 'COMPLETED' ? 'neutral' as const : 'success' as const,
            content: <div className="space-y-2"><Chip tone={session.status === 'CANCELLED' ? 'danger' : session.status === 'COMPLETED' ? 'neutral' : 'success'} dot>{session.status === 'SCHEDULED' ? 'Đã lên lịch' : session.status === 'CANCELLED' ? 'Đã hủy' : 'Đã hoàn thành'}</Chip>{session.status === 'SCHEDULED' && <div className="grid gap-1.5"><Button size="sm" variant="secondary" onClick={() => setChangeTarget({ id: session.id, startsAt: session.startsAt, roomId: session.roomId })}>Đổi lịch</Button><Button size="sm" variant="danger" onClick={() => setCancelTarget({ id: session.id, title: formatDateTime(session.startsAt) })}>Hủy buổi học</Button></div>}</div>,
            }))} />
          </div>
        )}
      </Card>
      {editing && <EditGroupClassDialog groupClass={groupClass} onClose={() => setEditing(false)} />}
      {creatingSession === 'single' && <CreateSessionDialog classId={classId} onClose={() => setCreatingSession(null)} />}
      {creatingSession === 'recurring' && <RecurringScheduleDialog groupClass={groupClass} onClose={() => setCreatingSession(null)} />}
      {changeTarget && <ChangeSessionDialog classId={classId} target={changeTarget} onClose={() => setChangeTarget(null)} />}
      <CancelSessionDialog
        key={cancelTarget?.id ?? 'closed'}
        target={cancelTarget}
        loading={cancel.isPending}
        error={cancel.isError ? errorText(cancel.error) : ''}
        onCancel={() => { if (!cancel.isPending) { cancel.reset(); setCancelTarget(null); } }}
        onSubmit={cancelSession}
      />
    </div>
  );
}

function EditGroupClassDialog({ groupClass, onClose }: { groupClass: GroupClass; onClose: () => void }) {
  const update = useUpdateGroupClass(groupClass.id);
  const sports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: retryServerErrors });
  const form = useForm<EditValues>({ resolver: zodResolver(editSchema), defaultValues: initialValues(groupClass) });
  const selectedSport = useWatch({ control: form.control, name: 'sportId' });
  const sportId = Number(selectedSport);
  const coaches = useQualifiedCoaches(Number.isInteger(sportId) && sportId > 0 ? sportId : undefined);
  const previousSport = useRef(selectedSport);
  useEffect(() => {
    if (previousSport.current !== selectedSport) {
      form.setValue('coachId', '', { shouldValidate: true, shouldDirty: true });
      previousSport.current = selectedSport;
    }
  }, [form, selectedSport]);
  const values = form.formState.errors;

  const submit = form.handleSubmit(async (formValues) => {
    try {
      await update.mutateAsync({
        sportId: Number(formValues.sportId),
        coachId: Number(formValues.coachId),
        name: formValues.name.trim(),
        description: formValues.description.trim() || null,
        capacity: Number(formValues.capacity),
        tuitionFee: Number(formValues.tuitionFee),
        registrationOpenAt: fromCenterDateTimeInput(formValues.registrationOpenAt),
        registrationCloseAt: fromCenterDateTimeInput(formValues.registrationCloseAt),
        startDate: `${formValues.startDate}T00:00:00.000Z`,
        endDate: `${formValues.endDate}T00:00:00.000Z`,
      });
      toast('Đã cập nhật thông tin lớp học.');
      onClose();
    } catch (error) {
      const apiError = parseApiError(error);
      if (apiError.code === 'CLASS_CAPACITY_BELOW_OCCUPANCY') {
        form.setError('capacity', { type: 'server', message: apiError.message });
      } else {
        form.setError('root.server', { message: apiError.message });
      }
    }
  });
  const closeWhenIdle = () => {
    if (!update.isPending) onClose();
  };
  const inputError = (name: keyof EditValues) => values[name]?.message;

  return (
    <Dialog
      open
      onClose={closeWhenIdle}
      title="Sửa thông tin lớp"
      description="Trạng thái lớp không được sửa trong form này; trạng thái có endpoint quản lý riêng."
      size="lg"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={update.isPending}>Đóng</Button><Button onClick={submit} loading={update.isPending} disabled={sports.isError || coaches.isError || sports.isPending || coaches.isPending}>Lưu thay đổi</Button></>}
    >
      {sports.isPending || coaches.isPending ? (
        <ListSkeleton rows={3} label="Đang tải môn thể thao và Coach…" />
      ) : sports.isError || coaches.isError ? (
        <div className="space-y-3">
          <InlineAlert>Không tải được danh sách môn hoặc Coach: {sports.isError ? errorText(sports.error) : errorText(coaches.error)}</InlineAlert>
          <div className="flex flex-wrap gap-2">
            {sports.isError && <Button size="sm" variant="secondary" onClick={() => sports.refetch()} loading={sports.isRefetching}>Tải lại môn</Button>}
            {coaches.isError && <Button size="sm" variant="secondary" onClick={() => coaches.refetch()} loading={coaches.isRefetching}>Tải lại Coach</Button>}
          </div>
        </div>
      ) : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
          <Field id="class-sport" label="Môn thể thao" required error={inputError('sportId')}><select id="class-sport" className={inputClass} aria-invalid={Boolean(inputError('sportId'))} {...form.register('sportId')}><option value="">Chọn môn</option>{sports.data?.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}</select></Field>
          <Field id="class-coach" label="Coach" required error={inputError('coachId')}>
            <select id="class-coach" className={inputClass} aria-invalid={Boolean(inputError('coachId'))} disabled={!sportId || coaches.isPending} {...form.register('coachId')}>
              <option value="">{!sportId ? 'Chọn môn trước' : coaches.isPending ? 'Đang tải Coach phù hợp…' : 'Chọn Coach đúng chuyên môn'}</option>
              {coaches.data?.map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName} · {coach.coachCode}</option>)}
            </select>
            {sportId > 0 && !coaches.isPending && coaches.data?.length === 0 && <p className="mt-2 text-xs font-semibold text-orange-700">Chưa có Coach hoạt động có chuyên môn này.</p>}
          </Field>
          <Field id="class-name" label="Tên lớp" required error={inputError('name')} className="sm:col-span-2"><input id="class-name" className={inputClass} aria-invalid={Boolean(inputError('name'))} {...form.register('name')} /></Field>
          <Field id="class-description" label="Mô tả" className="sm:col-span-2"><textarea id="class-description" className={textareaClass} {...form.register('description')} /></Field>
          <Field id="class-capacity" label="Sức chứa" required error={inputError('capacity')}><input id="class-capacity" type="number" min="1" step="1" className={inputClass} aria-invalid={Boolean(inputError('capacity'))} {...form.register('capacity')} /></Field>
          <Field id="class-fee" label="Học phí (₫)" required error={inputError('tuitionFee')}><input id="class-fee" type="number" min="0" step="0.01" className={inputClass} aria-invalid={Boolean(inputError('tuitionFee'))} {...form.register('tuitionFee')} /></Field>
          <Field id="class-registration-open" label="Mở đăng ký" required error={inputError('registrationOpenAt')}><input id="class-registration-open" type="datetime-local" className={inputClass} aria-invalid={Boolean(inputError('registrationOpenAt'))} {...form.register('registrationOpenAt')} /></Field>
          <Field id="class-registration-close" label="Đóng đăng ký" required error={inputError('registrationCloseAt')}><input id="class-registration-close" type="datetime-local" className={inputClass} aria-invalid={Boolean(inputError('registrationCloseAt'))} {...form.register('registrationCloseAt')} /></Field>
          <Field id="class-start-date" label="Ngày bắt đầu lớp" required error={inputError('startDate')}><input id="class-start-date" type="date" className={inputClass} aria-invalid={Boolean(inputError('startDate'))} {...form.register('startDate')} /></Field>
          <Field id="class-end-date" label="Ngày kết thúc lớp" required error={inputError('endDate')}><input id="class-end-date" type="date" className={inputClass} aria-invalid={Boolean(inputError('endDate'))} {...form.register('endDate')} /></Field>
          {values.root?.server?.message && <div className="sm:col-span-2"><InlineAlert>{values.root.server.message}</InlineAlert></div>}
        </form>
      )}
    </Dialog>
  );
}

function CancelSessionDialog({
  target,
  loading,
  error,
  onCancel,
  onSubmit,
}: {
  target: SessionTarget;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const handleSubmit = () => {
    const clean = reason.trim();
    if (!clean) { setValidationError('Vui lòng nhập lý do hủy.'); return; }
    setValidationError('');
    onSubmit(clean);
  };

  return (
    <Dialog
      open={target !== null}
      onClose={onCancel}
      title="Hủy riêng buổi học"
      description={target ? `Buổi ${target.title}. Thao tác này không hủy toàn bộ lớp.` : undefined}
      size="md"
      footer={<><Button variant="secondary" onClick={onCancel} disabled={loading}>Không hủy</Button><Button variant="danger" onClick={handleSubmit} loading={loading}>Xác nhận hủy buổi</Button></>}
    >
      <Field id="cancel-session-reason" label="Lý do hủy" required error={validationError}>
        <textarea id="cancel-session-reason" className={textareaClass} value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(''); }} aria-invalid={Boolean(validationError)} disabled={loading} />
      </Field>
      {error && <div className="mt-4"><InlineAlert>{error}</InlineAlert></div>}
    </Dialog>
  );
}

function createSessionFormSchema() {
  return z.object({
    roomId: z.string().min(1, 'Chọn phòng học.'),
    startsAt: z.string(),
    endsAt: z.string(),
    note: z.string(),
  }).superRefine((value, context) => {
    if (!value.startsAt) context.addIssue({ code: 'custom', path: ['startsAt'], message: 'Chọn giờ bắt đầu.' });
    if (!value.endsAt) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Chọn giờ kết thúc.' });
    if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Giờ kết thúc phải sau giờ bắt đầu.' });
  });
}
const changeSessionSchema = z.object({
  startsAt: z.string().min(1, 'Chọn giờ bắt đầu mới.'),
  roomId: z.string().min(1, 'Chọn phòng.'),
  reason: z.string().trim().min(1, 'Nhập lý do đổi lịch.'),
});

function CreateSessionDialog({ classId, onClose }: { classId: number; onClose: () => void }) {
  const rooms = useRooms();
  const single = useCreateClassSession(classId);
  const pending = single.isPending;
  const form = useForm<z.infer<ReturnType<typeof createSessionFormSchema>>>({
    resolver: zodResolver(createSessionFormSchema()),
    defaultValues: {
      roomId: '',
      startsAt: '',
      endsAt: '',
      note: '',
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    try {
      await single.mutateAsync({
        roomId: Number(values.roomId),
        startsAt: fromCenterDateTimeInput(values.startsAt),
        endsAt: fromCenterDateTimeInput(values.endsAt),
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      });
      toast('Đã tạo buổi học.');
      onClose();
    } catch (error) {
      form.setError('root.server', { message: errorText(error) });
    }
  });
  const closeWhenIdle = () => { if (!pending) onClose(); };
  const error = (name: keyof typeof errors) => errors[name]?.message;

  return (
    <Dialog open onClose={closeWhenIdle} title="Thêm buổi học" description="Lịch phòng, Coach và hội viên sẽ được backend kiểm tra khi lưu." size="lg"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending} disabled={rooms.isPending || rooms.isError}>Tạo buổi học</Button></>}>
      {rooms.isPending ? <ListSkeleton rows={3} label="Đang tải danh sách phòng…" /> : rooms.isError ? <InlineAlert>Không tải được danh sách phòng: {errorText(rooms.error)}</InlineAlert> : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
          <Field id="session-room" label="Phòng học" required error={error('roomId')} className="sm:col-span-2">
            <select id="session-room" className={inputClass} {...form.register('roomId')}><option value="">Chọn phòng đang khả dụng</option>{rooms.data?.filter((room) => room.status === 'AVAILABLE').map((room) => <option key={room.id} value={room.id}>{room.name} · sức chứa {room.capacity}{room.location ? ` · ${room.location}` : ''}</option>)}</select>
          </Field>
          <Field id="session-start" label="Giờ bắt đầu" required error={error('startsAt')}><input id="session-start" type="datetime-local" className={inputClass} {...form.register('startsAt')} /></Field>
          <Field id="session-end" label="Giờ kết thúc" required error={error('endsAt')}><input id="session-end" type="datetime-local" className={inputClass} {...form.register('endsAt')} /></Field>
          <Field id="session-note" label="Ghi chú" className="sm:col-span-2"><textarea id="session-note" className={textareaClass} {...form.register('note')} /></Field>
          {errors.root?.server?.message && <div className="sm:col-span-2"><InlineAlert>{errors.root.server.message}</InlineAlert></div>}
        </form>
      )}
    </Dialog>
  );
}

const TIMETABLE_DAYS = [
  { value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' }, { value: 0, label: 'Chủ nhật' },
];
const STANDARD_CLASS_SHIFTS = [
  { start: '07:00', end: '08:30' },
  { start: '09:00', end: '10:30' },
  { start: '11:00', end: '12:30' },
  { start: '13:30', end: '15:00' },
  { start: '15:30', end: '17:00' },
  { start: '17:30', end: '19:00' },
  { start: '19:30', end: '21:00' },
];
const availabilityClock = (value: string) => value.includes('T') ? value.slice(11, 16) : value.slice(0, 5);
const slotKey = (dayOfWeek: number, startTime: string, endTime: string) => `${dayOfWeek}:${startTime}:${endTime}`;

function RecurringScheduleDialog({ groupClass, onClose }: { groupClass: GroupClass; onClose: () => void }) {
  const startDate = groupClass.startDate.slice(0, 10);
  const endDate = groupClass.endDate.slice(0, 10);
  const availability = useCoachAvailability(groupClass.coachId);
  const schedule = useCoachSchedule(groupClass.coachId, startDate, endDate);
  const rooms = useRooms();
  const preview = usePreviewRecurringClassSessions(groupClass.id);
  const create = useCreateRecurringClassSessions(groupClass.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [roomsBySlot, setRoomsBySlot] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  const slots = useMemo(() => {
    const approvedWindows = (availability.data ?? [])
      .filter((item) => item.status === 'AVAILABLE' && item.effectiveFrom.slice(0, 10) <= endDate && (!item.effectiveTo || item.effectiveTo.slice(0, 10) >= startDate))
      .map((item) => ({ dayOfWeek: item.dayOfWeek, start: availabilityClock(item.startTime), end: availabilityClock(item.endTime) }));
    return TIMETABLE_DAYS.flatMap((day) => STANDARD_CLASS_SHIFTS
      .filter((shift) => approvedWindows.some((window) => window.dayOfWeek === day.value && window.start <= shift.start && window.end >= shift.end))
      .map((shift) => ({ dayOfWeek: day.value, ...shift })));
  }, [availability.data, endDate, startDate]);
  const availableRooms = rooms.data?.filter((room) => room.status === 'AVAILABLE' && room.capacity >= groupClass.capacity) ?? [];
  const busyKeys = useMemo(() => {
    const busyWindows = (schedule.data ?? []).map((item) => {
    const formatter = (value: string) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
    const start = formatter(item.startsAt);
    const end = formatter(item.endsAt);
    const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[start.weekday];
      return { dayOfWeek: day, start: `${start.hour}:${start.minute}`, end: `${end.hour}:${end.minute}` };
    });
    return new Set(slots
      .filter((slot) => busyWindows.some((busy) => busy.dayOfWeek === slot.dayOfWeek && busy.start < slot.end && busy.end > slot.start))
      .map((slot) => slotKey(slot.dayOfWeek, slot.start, slot.end)));
  }, [schedule.data, slots]);

  const buildInput = (): CreateRecurringSessionsInput => ({
    patterns: selected.map((key) => {
      const slot = slots.find((item) => slotKey(item.dayOfWeek, item.start, item.end) === key)!;
      return { dayOfWeek: slot.dayOfWeek, startTime: slot.start, endTime: slot.end, roomId: Number(roomsBySlot[key]) };
    }),
    effectiveFrom: startDate,
    effectiveTo: endDate,
    ...(note.trim() ? { note: note.trim() } : {}),
  });
  const canPreview = selected.length > 0 && selected.every((key) => Number(roomsBySlot[key]) > 0);
  const pending = preview.isPending || create.isPending;
  const closeWhenIdle = () => { if (!pending) onClose(); };
  const toggle = (key: string) => {
    preview.reset();
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    setRoomsBySlot((current) => current[key] || !availableRooms[0] ? current : { ...current, [key]: String(availableRooms[0].id) });
  };
  const runPreview = async () => { if (canPreview) await preview.mutateAsync(buildInput()); };
  const confirm = async () => {
    if (!preview.data?.canCreate) return;
    try {
      await create.mutateAsync(buildInput());
      toast(`Đã tạo ${preview.data.total} buổi học theo thời khóa biểu.`);
      onClose();
    } catch (error) { toast(errorText(error), 'error'); }
  };

  return (
    <Dialog open onClose={closeWhenIdle} title="Xếp thời khóa biểu cho lớp" description={`Chọn ca đã được duyệt của Coach ${groupClass.coach.user.displayName}. Lịch áp dụng từ ${startDate} đến ${endDate}.`} size="xl"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={pending}>Đóng</Button>{preview.data?.canCreate ? <Button onClick={confirm} loading={create.isPending}>Xác nhận tạo {preview.data.total} buổi</Button> : <Button onClick={runPreview} loading={preview.isPending} disabled={!canPreview}>Kiểm tra lịch</Button>}</>}>
      {availability.isPending || schedule.isPending || rooms.isPending ? <ListSkeleton rows={5} label="Đang tải availability, lịch Coach và phòng học…" /> : availability.isError || schedule.isError || rooms.isError ? <InlineAlert>Không tải được dữ liệu xếp lịch. Vui lòng thử lại.</InlineAlert> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/6 px-4 py-3 text-sm">
            <p><strong>{selected.length} ca đã chọn</strong><span className="ml-2 text-muted">Có thể chọn một hoặc nhiều ca mỗi tuần.</span></p>
            <div className="flex flex-wrap gap-3 text-xs font-bold"><span className="text-primary-deep">● Khả dụng</span><span className="text-orange-700">● Coach đã bận</span></div>
          </div>
          {availableRooms.length === 0 && <InlineAlert>Chưa có phòng đang hoạt động đủ sức chứa {groupClass.capacity} học viên. Hãy cập nhật phòng trước khi xếp lịch.</InlineAlert>}
          {slots.length === 0 ? <EmptyState compact icon={<CalendarBlank />} title="Coach chưa có availability phù hợp" description="Coach cần gửi lịch và được Center Manager duyệt trước khi xếp lớp." /> : (
            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[820px] table-fixed">
                <thead className="sticky top-0 z-20"><tr className="bg-canvas"><th className="sticky left-0 z-30 w-32 bg-canvas px-3 py-3 text-left text-xs font-bold text-muted">Ca 90 phút</th>{TIMETABLE_DAYS.map((day) => <th key={day.value} className="px-2 py-3 text-center text-xs font-extrabold text-ink">{day.label}</th>)}</tr></thead>
                <tbody>{[...new Set(slots.map((item) => `${item.start}-${item.end}`))].sort().map((time) => {
                  const [start, end] = time.split('-');
                  return <tr key={time} className="border-t border-line"><th className="sticky left-0 z-10 bg-surface px-3 py-3 text-left text-xs"><span className="block font-extrabold text-primary-deep">{start}–{end}</span><span className="text-muted">Ca khả dụng</span></th>{TIMETABLE_DAYS.map((day) => {
                    const slot = slots.find((item) => item.dayOfWeek === day.value && item.start === start && item.end === end);
                    if (!slot) return <td key={day.value} className="p-1.5"><div className="grid min-h-20 place-items-center rounded-xl bg-canvas text-muted/50">—</div></td>;
                    const key = slotKey(day.value, start!, end!);
                    const active = selected.includes(key);
                    const busy = busyKeys.has(key);
                    return <td key={day.value} className="p-1.5"><button type="button" disabled={busy} aria-pressed={active} onClick={() => toggle(key)} className={`flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-primary ${busy ? 'cursor-not-allowed bg-orange-50 text-orange-800' : active ? 'bg-primary text-white shadow-soft' : 'bg-primary/7 text-primary-deep hover:bg-primary/12'}`}>{busy ? <WarningCircle size={18} weight="fill" /> : active ? <Check size={18} weight="bold" /> : <Clock size={18} />}<span>{busy ? 'Coach đã bận' : active ? 'Đã chọn' : 'Có thể dạy'}</span></button>{active && <select aria-label={`Phòng cho ${day.label} ${start}`} className={`${inputClass} mt-1 h-9 py-1 text-xs`} value={roomsBySlot[key] ?? ''} onChange={(event) => { preview.reset(); setRoomsBySlot((current) => ({ ...current, [key]: event.target.value })); }}><option value="">Chọn phòng</option>{availableRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select>}</td>;
                  })}</tr>;
                })}</tbody>
              </table>
            </div>
          )}
          <Field id="recurring-note" label="Ghi chú chung"><textarea id="recurring-note" className={textareaClass} value={note} onChange={(event) => { preview.reset(); setNote(event.target.value); }} /></Field>
          {preview.isError && <InlineAlert>{errorText(preview.error)}</InlineAlert>}
          {preview.data && <div className={`rounded-xl px-4 py-3 text-sm ${preview.data.canCreate ? 'bg-lime-50 text-lime-900' : 'bg-red-50 text-red-900'}`}><strong>{preview.data.canCreate ? `Có thể tạo ${preview.data.total} buổi học.` : `${preview.data.conflicts}/${preview.data.total} buổi đang xung đột.`}</strong>{!preview.data.canCreate && <ul className="mt-2 list-disc space-y-1 pl-5">{preview.data.occurrences.filter((item) => !item.valid).slice(0, 6).map((item) => <li key={`${item.startsAt}-${item.roomId}`}>{formatDateTime(item.startsAt)}: {item.message}</li>)}</ul>}</div>}
        </div>
      )}
    </Dialog>
  );
}

function ChangeSessionDialog({ classId, target, onClose }: { classId: number; target: NonNullable<ChangeTarget>; onClose: () => void }) {
  const rooms = useRooms();
  const change = useChangeClassSession(classId);
  const form = useForm<z.infer<typeof changeSessionSchema>>({
    resolver: zodResolver(changeSessionSchema),
    defaultValues: { startsAt: toCenterDateTimeInput(target.startsAt), roomId: String(target.roomId), reason: '' },
  });
  const pending = change.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      await change.mutateAsync({
        sessionId: target.id,
        input: {
          newStartsAt: fromCenterDateTimeInput(values.startsAt),
          ...(Number(values.roomId) !== target.roomId ? { newRoomId: Number(values.roomId) } : {}),
          reason: values.reason.trim(),
        },
      });
      toast('Đã cập nhật riêng buổi học đã chọn.');
      onClose();
    } catch (error) {
      form.setError('root.server', { message: errorText(error) });
    }
  });
  const closeWhenIdle = () => { if (!pending) onClose(); };

  return (
    <Dialog open onClose={closeWhenIdle} title="Đổi lịch buổi học" description="Chỉ buổi này được thay đổi; thời lượng buổi học được giữ nguyên. Giữ nguyên phòng nếu không chọn phòng khác." size="md"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending} disabled={rooms.isPending || rooms.isError}>Lưu lịch mới</Button></>}>
      {rooms.isPending ? <ListSkeleton rows={2} label="Đang tải danh sách phòng…" /> : rooms.isError ? <InlineAlert>Không tải được danh sách phòng: {errorText(rooms.error)}</InlineAlert> : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field id="change-start" label="Giờ bắt đầu mới" required error={form.formState.errors.startsAt?.message}><input id="change-start" type="datetime-local" className={inputClass} {...form.register('startsAt')} /></Field>
          <Field id="change-room" label="Phòng" required error={form.formState.errors.roomId?.message}>
            <select id="change-room" className={inputClass} {...form.register('roomId')}>
              <option value={target.roomId}>{rooms.data?.find((room) => room.id === target.roomId)?.name ?? 'Giữ nguyên phòng hiện tại'}</option>
              {rooms.data?.filter((room) => room.status === 'AVAILABLE' && room.id !== target.roomId).map((room) => <option key={room.id} value={room.id}>{room.name} · sức chứa {room.capacity}</option>)}
            </select>
          </Field>
          <Field id="change-reason" label="Lý do đổi lịch" required error={form.formState.errors.reason?.message}><textarea id="change-reason" className={textareaClass} {...form.register('reason')} /></Field>
          {form.formState.errors.root?.server?.message && <InlineAlert>{form.formState.errors.root.server.message}</InlineAlert>}
        </form>
      )}
    </Dialog>
  );
}
