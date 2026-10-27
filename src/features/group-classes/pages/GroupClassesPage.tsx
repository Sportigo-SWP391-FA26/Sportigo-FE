import { CalendarBlank, Plus } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { useCoaches } from '../../coaches/hooks/useCoachManagement';
import { getSports } from '../../catalog/api';
import { ButtonLink } from '../../training/components/ui/Button';
import { Button } from '../../training/components/ui/Button';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { inputClass, textareaClass } from '../../training/components/ui/styles';
import { addDays, fromCenterDateTimeInput, formatDate, todayInCenter } from '../../training/format';
import { parseApiError, retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { useCreateGroupClass, useGroupClasses } from '../hooks/useGroupClasses';
import type { CreateGroupClassInput } from '../types';

const schema = z.object({
  sportId: z.string().min(1, 'Chọn môn thể thao.'),
  coachId: z.string().min(1, 'Chọn Coach.'),
  name: z.string().trim().min(1, 'Tên lớp không được để trống.'),
  description: z.string(),
  capacity: z.string().regex(/^[1-9]\d*$/, 'Sức chứa phải là số nguyên dương.'),
  tuitionFee: z.string().regex(/^\d+(?:\.\d{1,2})?$/, 'Học phí phải là số không âm.'),
  registrationOpenAt: z.string().min(1, 'Nhập thời gian mở đăng ký.'),
  registrationCloseAt: z.string().min(1, 'Nhập thời gian đóng đăng ký.'),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu lớp.'),
  endDate: z.string().min(1, 'Chọn ngày kết thúc lớp.'),
}).superRefine((value, context) => {
  if (value.registrationOpenAt >= value.registrationCloseAt) {
    context.addIssue({ code: 'custom', path: ['registrationCloseAt'], message: 'Thời gian đóng phải sau thời gian mở đăng ký.' });
  }
  if (value.registrationCloseAt.slice(0, 10) > value.startDate) {
    context.addIssue({ code: 'custom', path: ['registrationCloseAt'], message: 'Đóng đăng ký không được sau ngày bắt đầu lớp.' });
  }
  if (value.startDate > value.endDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' });
  }
});
type Values = z.infer<typeof schema>;

function classStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Bản nháp',
    OPEN: 'Đang mở',
    CLOSED: 'Đã đóng',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Đã kết thúc',
  };
  return labels[status] ?? status;
}

export function GroupClassesPage() {
  const classes = useGroupClasses();
  const [creating, setCreating] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader eyebrow="Lớp nhóm" title="Danh sách lớp học" description="Quản lý thông tin lớp, vòng đời đăng ký và từng buổi học riêng lẻ."
        actions={<Button icon={<Plus aria-hidden="true" />} onClick={() => setCreating(true)}>Tạo lớp nhóm</Button>} />
      {classes.isPending ? (
        <ListSkeleton label="Đang tải danh sách lớp…" />
      ) : classes.isError ? (
        <ErrorState error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isRefetching} pendingApi="GET /api/group-classes" />
      ) : classes.data.length === 0 ? (
        <EmptyState icon={<CalendarBlank />} title="Chưa có lớp nhóm" description="Chưa có lớp nào được tạo trong hệ thống." action={<Button onClick={() => setCreating(true)}>Tạo lớp nhóm</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {classes.data.map((groupClass) => (
            <Card key={groupClass.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/app/classes/${groupClass.id}`} className="text-lg font-extrabold text-ink hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-primary">{groupClass.name}</Link>
                  <p className="mt-1 text-sm text-muted">{groupClass.sport.name} · Coach {groupClass.coach.user.displayName}</p>
                </div>
                <Chip tone={groupClass.status === 'OPEN' ? 'success' : groupClass.status === 'CANCELLED' ? 'danger' : 'neutral'} dot>{classStatus(groupClass.status)}</Chip>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p><span className="text-muted">Sức chứa</span><br /><strong>{groupClass.capacity}</strong></p>
                <p><span className="text-muted">Học phí</span><br /><strong>{new Intl.NumberFormat('vi-VN').format(Number(groupClass.tuitionFee))} ₫</strong></p>
                <p><span className="text-muted">Bắt đầu</span><br /><strong>{formatDate(groupClass.startDate)}</strong></p>
                <p><span className="text-muted">Kết thúc</span><br /><strong>{formatDate(groupClass.endDate)}</strong></p>
              </div>
              <div className="mt-4 flex justify-end"><ButtonLink to={`/app/classes/${groupClass.id}`} size="sm">Chi tiết và buổi học</ButtonLink></div>
            </Card>
          ))}
        </div>
      )}
      {creating && <CreateGroupClassDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateGroupClassDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateGroupClass();
  const sports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: retryServerErrors });
  const coaches = useCoaches();
  const today = todayInCenter();
  const startDate = addDays(today, 7);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      sportId: '',
      coachId: '',
      name: '',
      description: '',
      capacity: '',
      tuitionFee: '',
      registrationOpenAt: `${today}T00:00`,
      registrationCloseAt: `${addDays(startDate, -1)}T23:59`,
      startDate,
      endDate: addDays(startDate, 28),
    },
  });
  const errors = form.formState.errors;
  const pending = form.formState.isSubmitting || create.isPending;
  const submit = form.handleSubmit(async (values) => {
    const input: CreateGroupClassInput = {
      sportId: Number(values.sportId),
      coachId: Number(values.coachId),
      name: values.name.trim(),
      description: values.description.trim() || null,
      capacity: Number(values.capacity),
      tuitionFee: Number(values.tuitionFee),
      registrationOpenAt: fromCenterDateTimeInput(values.registrationOpenAt),
      registrationCloseAt: fromCenterDateTimeInput(values.registrationCloseAt),
      startDate: `${values.startDate}T00:00:00.000Z`,
      endDate: `${values.endDate}T00:00:00.000Z`,
    };
    try {
      await create.mutateAsync(input);
      toast('Đã tạo lớp ở trạng thái bản nháp. Tạo lịch buổi và hoàn thiện dữ liệu trước khi mở đăng ký.');
      onClose();
    } catch (error) {
      form.setError('root.server', { message: parseApiError(error).message });
    }
  });
  const activeCoaches = coaches.data?.filter((coach) => coach.status === 'ACTIVE' && coach.coachStatus === 'ACTIVE') ?? [];
  const closeWhenIdle = () => { if (!pending) onClose(); };
  const fieldError = (name: keyof Values) => errors[name]?.message;

  return (
    <Dialog open onClose={closeWhenIdle} title="Tạo lớp nhóm" description="Lớp mới được tạo ở trạng thái Bản nháp. Trạng thái không được gửi qua form này." size="lg"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending} disabled={sports.isPending || sports.isError || coaches.isPending || coaches.isError}>Tạo bản nháp</Button></>}>
      {sports.isPending || coaches.isPending ? <ListSkeleton rows={3} label="Đang tải môn thể thao và Coach…" /> :
        sports.isError || coaches.isError ? <InlineAlert>Không tải được dữ liệu bắt buộc: {sports.isError ? parseApiError(sports.error).message : parseApiError(coaches.error).message}</InlineAlert> : (
          <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field id="new-class-sport" label="Môn thể thao" required error={fieldError('sportId')}>
              <select id="new-class-sport" className={inputClass} {...form.register('sportId')}><option value="">Chọn môn đang hoạt động</option>{sports.data?.filter((sport) => sport.isActive).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}</select>
            </Field>
            <Field id="new-class-coach" label="Coach" required error={fieldError('coachId')}>
              <select id="new-class-coach" className={inputClass} {...form.register('coachId')}><option value="">Chọn Coach đang hoạt động</option>{activeCoaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName}</option>)}</select>
            </Field>
            <Field id="new-class-name" label="Tên lớp" required error={fieldError('name')} className="sm:col-span-2"><input id="new-class-name" className={inputClass} {...form.register('name')} /></Field>
            <Field id="new-class-description" label="Mô tả" className="sm:col-span-2"><textarea id="new-class-description" className={textareaClass} {...form.register('description')} /></Field>
            <Field id="new-class-capacity" label="Sức chứa" required error={fieldError('capacity')}><input id="new-class-capacity" type="number" min="1" step="1" className={inputClass} {...form.register('capacity')} /></Field>
            <Field id="new-class-fee" label="Học phí (₫)" required error={fieldError('tuitionFee')}><input id="new-class-fee" type="number" min="0" step="0.01" className={inputClass} {...form.register('tuitionFee')} /></Field>
            <Field id="new-class-open" label="Mở đăng ký" required error={fieldError('registrationOpenAt')}><input id="new-class-open" type="datetime-local" className={inputClass} {...form.register('registrationOpenAt')} /></Field>
            <Field id="new-class-close" label="Đóng đăng ký" required error={fieldError('registrationCloseAt')}><input id="new-class-close" type="datetime-local" className={inputClass} {...form.register('registrationCloseAt')} /></Field>
            <Field id="new-class-start" label="Ngày bắt đầu lớp" required error={fieldError('startDate')}><input id="new-class-start" type="date" className={inputClass} {...form.register('startDate')} /></Field>
            <Field id="new-class-end" label="Ngày kết thúc lớp" required error={fieldError('endDate')}><input id="new-class-end" type="date" className={inputClass} {...form.register('endDate')} /></Field>
            {errors.root?.server?.message && <div className="sm:col-span-2"><InlineAlert>{errors.root.server.message}</InlineAlert></div>}
          </form>
        )}
    </Dialog>
  );
}
