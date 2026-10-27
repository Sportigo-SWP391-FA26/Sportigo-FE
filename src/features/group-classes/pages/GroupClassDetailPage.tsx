import { CalendarBlank, PencilSimple, Plus } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { getSports } from '../../training/api';
import { Button, ButtonLink } from '../../training/components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { addDays, fromCenterDateTimeInput, formatDateTime, toCenterDateTimeInput } from '../../training/format';
import { parseApiError, retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { inputClass, textareaClass } from '../../training/components/ui/styles';
import { useCoaches } from '../../coaches/hooks/useCoachManagement';
import { useRooms } from '../../catalog/hooks';
import { useGroupClassSessions, useGroupClasses, useCancelClassSession, useChangeClassSession, useCreateClassSession, useCreateRecurringClassSessions, useUpdateGroupClass, useUpdateGroupClassStatus } from '../hooks/useGroupClasses';
import type { GroupClass } from '../types';

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
  const classes = useGroupClasses();
  const sessions = useGroupClassSessions(classId);
  const [editing, setEditing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SessionTarget>(null);
  const [changeTarget, setChangeTarget] = useState<ChangeTarget>(null);
  const [creatingSession, setCreatingSession] = useState<'single' | 'recurring' | null>(null);
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
        ) : sessions.data.length === 0 ? (
          <EmptyState compact icon={<CalendarBlank />} title="Lớp chưa có buổi học" description="Chưa có ClassSession nào được tạo cho lớp này." />
        ) : (
          <ul className="divide-y divide-line">
            {sessions.data.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="font-bold text-ink">{formatDateTime(session.startsAt)} – {formatDateTime(session.endsAt).split(' ')[1]}</p><p className="text-xs text-muted">{session.room?.name ?? 'Chưa có phòng'}{session.note ? ` · ${session.note}` : ''}</p></div>
                <Chip tone={session.status === 'CANCELLED' ? 'danger' : session.status === 'COMPLETED' ? 'neutral' : 'success'} dot>{session.status === 'SCHEDULED' ? 'Đã lên lịch' : session.status === 'CANCELLED' ? 'Đã hủy' : 'Đã hoàn thành'}</Chip>
                {session.status === 'SCHEDULED' && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setChangeTarget({ id: session.id, startsAt: session.startsAt, roomId: session.roomId })}>Đổi lịch</Button><Button size="sm" variant="danger" onClick={() => setCancelTarget({ id: session.id, title: formatDateTime(session.startsAt) })}>Hủy buổi học</Button></div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing && <EditGroupClassDialog groupClass={groupClass} onClose={() => setEditing(false)} />}
      {creatingSession && <CreateSessionDialog classId={classId} mode={creatingSession} onClose={() => setCreatingSession(null)} />}
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
  const coaches = useCoaches();
  const form = useForm<EditValues>({ resolver: zodResolver(editSchema), defaultValues: initialValues(groupClass) });
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
  const activeCoaches = coaches.data?.filter((item) => item.status === 'ACTIVE' && item.coachStatus === 'ACTIVE') ?? [];

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
          <Field id="class-coach" label="Coach" required error={inputError('coachId')}><select id="class-coach" className={inputClass} aria-invalid={Boolean(inputError('coachId'))} {...form.register('coachId')}><option value="">Chọn Coach đang hoạt động</option>{activeCoaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName}</option>)}</select></Field>
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

function createSessionFormSchema(mode: 'single' | 'recurring') {
  return z.object({
    roomId: z.string().min(1, 'Chọn phòng học.'),
    startsAt: z.string(),
    endsAt: z.string(),
    dayOfWeek: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    effectiveFrom: z.string(),
    effectiveTo: z.string(),
    note: z.string(),
  }).superRefine((value, context) => {
    if (mode === 'single') {
      if (!value.startsAt) context.addIssue({ code: 'custom', path: ['startsAt'], message: 'Chọn giờ bắt đầu.' });
      if (!value.endsAt) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Chọn giờ kết thúc.' });
      if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Giờ kết thúc phải sau giờ bắt đầu.' });
    } else {
      if (!/^[0-6]$/.test(value.dayOfWeek)) context.addIssue({ code: 'custom', path: ['dayOfWeek'], message: 'Chọn thứ trong tuần.' });
      if (!value.startTime) context.addIssue({ code: 'custom', path: ['startTime'], message: 'Nhập giờ bắt đầu.' });
      if (!value.endTime) context.addIssue({ code: 'custom', path: ['endTime'], message: 'Nhập giờ kết thúc.' });
      if (value.startTime && value.endTime && value.startTime >= value.endTime) context.addIssue({ code: 'custom', path: ['endTime'], message: 'Giờ kết thúc phải sau giờ bắt đầu.' });
      if (!value.effectiveFrom) context.addIssue({ code: 'custom', path: ['effectiveFrom'], message: 'Chọn ngày bắt đầu hiệu lực.' });
      if (!value.effectiveTo) context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'Chọn ngày kết thúc hiệu lực.' });
      if (value.effectiveFrom && value.effectiveTo && value.effectiveFrom > value.effectiveTo) context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'Ngày kết thúc hiệu lực phải bằng hoặc sau ngày bắt đầu.' });
    }
  });
}
function convertRecurringTimeToUtc(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const utcMinutes = hours * 60 + minutes - 7 * 60;
  const dayOffset = utcMinutes < 0 ? -1 : 0;
  const normalizedMinutes = (utcMinutes + 24 * 60) % (24 * 60);
  return {
    time: `${String(Math.floor(normalizedMinutes / 60)).padStart(2, '0')}:${String(normalizedMinutes % 60).padStart(2, '0')}`,
    dayOffset,
  };
}
const changeSessionSchema = z.object({
  startsAt: z.string().min(1, 'Chọn giờ bắt đầu mới.'),
  roomId: z.string().min(1, 'Chọn phòng.'),
  reason: z.string().trim().min(1, 'Nhập lý do đổi lịch.'),
});

function CreateSessionDialog({ classId, mode, onClose }: { classId: number; mode: 'single' | 'recurring'; onClose: () => void }) {
  const rooms = useRooms();
  const single = useCreateClassSession(classId);
  const recurring = useCreateRecurringClassSessions(classId);
  const isRecurring = mode === 'recurring';
  const pending = single.isPending || recurring.isPending;
  const form = useForm<z.infer<ReturnType<typeof createSessionFormSchema>>>({
    resolver: zodResolver(createSessionFormSchema(mode)),
    defaultValues: {
      roomId: '',
      startsAt: '',
      endsAt: '',
      note: '',
      dayOfWeek: '1',
      startTime: '09:00',
      endTime: '10:00',
      effectiveFrom: '',
      effectiveTo: '',
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isRecurring) {
        const utcStart = convertRecurringTimeToUtc(values.startTime);
        const utcEnd = convertRecurringTimeToUtc(values.endTime);
        if (utcStart.dayOffset !== utcEnd.dayOffset) {
          form.setError('endTime', { type: 'validate', message: 'Khung giờ này đi qua ranh giới ngày theo UTC; hãy chọn khung giờ có thể biểu diễn trong cùng ngày.' });
          return;
        }
        const dayOfWeek = (Number(values.dayOfWeek) + utcStart.dayOffset + 7) % 7;
        await recurring.mutateAsync({
          roomId: Number(values.roomId),
          recurrence: {
            dayOfWeek,
            startTime: utcStart.time,
            endTime: utcEnd.time,
            effectiveFrom: addDays(values.effectiveFrom, utcStart.dayOffset),
            effectiveTo: addDays(values.effectiveTo, utcStart.dayOffset),
          },
          ...(values.note?.trim() ? { note: values.note.trim() } : {}),
        });
      } else {
        await single.mutateAsync({
          roomId: Number(values.roomId),
          startsAt: fromCenterDateTimeInput(values.startsAt!),
          endsAt: fromCenterDateTimeInput(values.endsAt!),
          ...(values.note?.trim() ? { note: values.note.trim() } : {}),
        });
      }
      toast(isRecurring ? 'Đã tạo các buổi học lặp.' : 'Đã tạo buổi học.');
      onClose();
    } catch (error) {
      form.setError('root.server', { message: errorText(error) });
    }
  });
  const closeWhenIdle = () => { if (!pending) onClose(); };
  const error = (name: keyof typeof errors) => errors[name]?.message;

  return (
    <Dialog open onClose={closeWhenIdle} title={isRecurring ? 'Tạo lịch buổi học lặp' : 'Thêm buổi học'} description={isRecurring ? 'Ngày và giờ nhập theo giờ Việt Nam; hệ thống chuyển đổi sang UTC theo API. Lịch phòng và Coach sẽ được backend kiểm tra khi lưu.' : 'Lịch phòng và Coach sẽ được backend kiểm tra khi lưu.'} size="lg"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending} disabled={rooms.isPending || rooms.isError}>Tạo buổi học</Button></>}>
      {rooms.isPending ? <ListSkeleton rows={3} label="Đang tải danh sách phòng…" /> : rooms.isError ? <InlineAlert>Không tải được danh sách phòng: {errorText(rooms.error)}</InlineAlert> : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
          <Field id="session-room" label="Phòng học" required error={error('roomId')} className="sm:col-span-2">
            <select id="session-room" className={inputClass} {...form.register('roomId')}><option value="">Chọn phòng đang khả dụng</option>{rooms.data?.filter((room) => room.status === 'AVAILABLE').map((room) => <option key={room.id} value={room.id}>{room.name} · sức chứa {room.capacity}{room.location ? ` · ${room.location}` : ''}</option>)}</select>
          </Field>
          {isRecurring ? <>
            <Field id="recurring-day" label="Thứ trong tuần" required error={error('dayOfWeek')}>
              <select id="recurring-day" className={inputClass} {...form.register('dayOfWeek')}><option value="1">Thứ Hai</option><option value="2">Thứ Ba</option><option value="3">Thứ Tư</option><option value="4">Thứ Năm</option><option value="5">Thứ Sáu</option><option value="6">Thứ Bảy</option><option value="0">Chủ Nhật</option></select>
            </Field>
            <span />
            <Field id="recurring-start-time" label="Giờ bắt đầu" required error={error('startTime')}><input id="recurring-start-time" type="time" className={inputClass} {...form.register('startTime')} /></Field>
            <Field id="recurring-end-time" label="Giờ kết thúc" required error={error('endTime')}><input id="recurring-end-time" type="time" className={inputClass} {...form.register('endTime')} /></Field>
            <Field id="recurring-from" label="Ngày bắt đầu hiệu lực" required error={error('effectiveFrom')}><input id="recurring-from" type="date" className={inputClass} {...form.register('effectiveFrom')} /></Field>
            <Field id="recurring-to" label="Ngày kết thúc hiệu lực" required error={error('effectiveTo')}><input id="recurring-to" type="date" className={inputClass} {...form.register('effectiveTo')} /></Field>
          </> : <>
            <Field id="session-start" label="Giờ bắt đầu" required error={error('startsAt')}><input id="session-start" type="datetime-local" className={inputClass} {...form.register('startsAt')} /></Field>
            <Field id="session-end" label="Giờ kết thúc" required error={error('endsAt')}><input id="session-end" type="datetime-local" className={inputClass} {...form.register('endsAt')} /></Field>
          </>}
          <Field id="session-note" label="Ghi chú" className="sm:col-span-2"><textarea id="session-note" className={textareaClass} {...form.register('note')} /></Field>
          {errors.root?.server?.message && <div className="sm:col-span-2"><InlineAlert>{errors.root.server.message}</InlineAlert></div>}
        </form>
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
