import { CalendarBlank, Plus } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { useQualifiedCoaches } from '../../coaches/hooks/useCoachManagement';
import { getSports } from '../../catalog/api';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { CurrencyInput, DateInput, DateTimeInput } from '../../../components/ui/LocalizedInputs';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { addDays, fromCenterDateTimeInput, formatDate, todayInCenter } from '../../training/format';
import { parseApiError, retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { useCreateGroupClass, useDeleteGroupClass, useGroupClasses, useUpdateGroupClassStatus } from '../hooks/useGroupClasses';
import type { CreateGroupClassInput } from '../types';
import { CoachPicker } from '../../coaches/components/CoachPicker';

const schema = z.object({
  sportId: z.string().min(1, 'Chọn môn thể thao.'),
  coachId: z.string().min(1, 'Chọn Coach.'),
  name: z.string().trim().min(1, 'Tên lớp không được để trống.'),
  description: z.string(),
  capacity: z.string().regex(/^[1-9]\d*$/, 'Sức chứa phải là số nguyên dương.'),
  totalSessions: z.string().regex(/^[1-9]\d*$/, 'Nhập tổng số buổi.'),
  sessionsPerWeek: z.string().regex(/^[1-9]\d*$/, 'Nhập số buổi mỗi tuần.'),
  tuitionFee: z.string().regex(/^\d+(?:\.\d{1,2})?$/, 'Học phí phải là số không âm.'),
  registrationOpenAt: z.string().min(1, 'Nhập thời gian mở đăng ký.'),
  registrationCloseAt: z.string().min(1, 'Nhập thời gian đóng đăng ký.'),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu lớp.'),
}).superRefine((value, context) => {
  if (Number(value.sessionsPerWeek) > Number(value.totalSessions)) context.addIssue({ code: 'custom', path: ['sessionsPerWeek'], message: 'Số buổi mỗi tuần không vượt tổng số buổi.' });
  if (value.registrationOpenAt >= value.registrationCloseAt) {
    context.addIssue({ code: 'custom', path: ['registrationCloseAt'], message: 'Thời gian đóng phải sau thời gian mở đăng ký.' });
  }
  if (value.registrationCloseAt.slice(0, 10) > value.startDate) {
    context.addIssue({ code: 'custom', path: ['registrationCloseAt'], message: 'Đóng đăng ký không được sau ngày bắt đầu lớp.' });
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

function classStatusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'OPEN') return 'success';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'DRAFT') return 'warning';
  return 'neutral';
}

export function GroupClassesPage() {
  const classes = useGroupClasses();
  const updateStatus = useUpdateGroupClassStatus();
  const remove = useDeleteGroupClass();
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<{ id: number; name: string; kind: 'close' | 'delete' } | null>(null);
  const confirmAction = async () => {
    if (!action) return;
    try {
      if (action.kind === 'delete') await remove.mutateAsync(action.id);
      else await updateStatus.mutateAsync({ classId: action.id, status: 'CLOSED' });
      toast(action.kind === 'delete' ? 'Đã xóa bản nháp lớp nhóm.' : 'Đã đóng đăng ký lớp nhóm.');
      setAction(null);
    } catch (error) { toast(parseApiError(error).message, 'error'); }
  };
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
        <div className="grid gap-5 md:grid-cols-2">
          {classes.data.map((groupClass) => (
            <Card key={groupClass.id} className="group flex min-w-0 flex-col overflow-hidden p-0">
              <div className="relative aspect-[16/8] overflow-hidden bg-primary/8">
                {groupClass.sport.imageUrl ? (
                  <img
                    src={groupClass.sport.imageUrl}
                    alt={`Lớp ${groupClass.name}`}
                    className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-primary" aria-hidden="true"><CalendarBlank size={42} /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-deep backdrop-blur">
                  {groupClass.sport.name}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <Link
                    to={`/app/classes/${groupClass.id}`}
                    className="min-w-0 text-lg font-extrabold text-ink hover:text-primary-deep focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {groupClass.name}
                  </Link>
                  <Chip tone={classStatusTone(groupClass.status)} dot>{classStatus(groupClass.status)}</Chip>
                </div>
                {groupClass.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{groupClass.description}</p>}
                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4 text-sm">
                  <p className="min-w-0"><span className="text-xs text-muted">Coach phụ trách</span><br /><strong className="block truncate text-ink">{groupClass.coach.user.displayName}</strong></p>
                  <p><span className="text-xs text-muted">Sức chứa</span><br /><strong className="text-ink">{groupClass.capacity} học viên</strong></p>
                  <p><span className="text-xs text-muted">Bắt đầu</span><br /><strong className="text-ink">{formatDate(groupClass.startDate)}</strong></p>
                  <p><span className="text-xs text-muted">Kết thúc</span><br /><strong className="text-ink">{formatDate(groupClass.endDate)}</strong></p>
                </div>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                  <div>
                    <p className="text-xs text-muted">Học phí toàn khóa</p>
                    <p className="text-xl font-extrabold text-ink">{new Intl.NumberFormat('vi-VN').format(Number(groupClass.tuitionFee))} ₫</p>
                  </div>
                  <Link
                    to={`/app/classes/${groupClass.id}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-control bg-primary px-4 text-sm font-bold text-white hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Chi tiết lớp học
                  </Link>
                  {groupClass.status === 'OPEN' && <Button size="sm" variant="secondary" onClick={() => setAction({ id: groupClass.id, name: groupClass.name, kind: 'close' })}>Đóng lớp</Button>}
                  {groupClass.status === 'DRAFT' && <Button size="sm" variant="secondary" onClick={() => setAction({ id: groupClass.id, name: groupClass.name, kind: 'delete' })}>Xóa bản nháp</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {creating && <CreateGroupClassDialog onClose={() => setCreating(false)} />}
      {action && <Dialog open onClose={() => setAction(null)} title={action.kind === 'delete' ? 'Xóa bản nháp lớp nhóm?' : 'Đóng đăng ký lớp nhóm?'} description={`${action.name} · ${action.kind === 'delete' ? 'Chỉ xóa được lớp chưa có buổi học, người đăng ký hoặc danh sách chờ.' : 'Hội viên sẽ không thể đăng ký mới. Lịch và dữ liệu hiện có được giữ lại.'}`} footer={<><Button variant="secondary" onClick={() => setAction(null)}>Quay lại</Button><Button onClick={confirmAction} loading={remove.isPending || updateStatus.isPending}>{action.kind === 'delete' ? 'Xóa lớp' : 'Đóng lớp'}</Button></>}><p className="text-sm text-muted">{action.kind === 'delete' ? 'Thao tác xóa bản nháp không thể hoàn tác.' : 'Bạn có thể mở lại đăng ký trên trang chi tiết lớp.'}</p></Dialog>}
    </div>
  );
}

function CreateGroupClassDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateGroupClass();
  const navigate = useNavigate();
  const sports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: retryServerErrors });
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
      totalSessions: '12',
      sessionsPerWeek: '2',
      tuitionFee: '',
      registrationOpenAt: `${today}T00:00`,
      registrationCloseAt: `${addDays(startDate, -1)}T23:59`,
      startDate,
    },
  });
  const errors = form.formState.errors;
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
  const pending = form.formState.isSubmitting || create.isPending;
  const plannedWeeks = Math.ceil(Number(form.watch('totalSessions')) / Number(form.watch('sessionsPerWeek')));
  const provisionalEndDate = form.watch('startDate') && Number.isFinite(plannedWeeks) && plannedWeeks > 0 ? addDays(form.watch('startDate'), plannedWeeks * 7 - 1) : '';
  const submit = form.handleSubmit(async (values) => {
    const input: CreateGroupClassInput = {
      sportId: Number(values.sportId),
      coachId: Number(values.coachId),
      name: values.name.trim(),
      description: values.description.trim() || null,
      capacity: Number(values.capacity),
      totalSessions: Number(values.totalSessions),
      sessionsPerWeek: Number(values.sessionsPerWeek),
      tuitionFee: Number(values.tuitionFee),
      registrationOpenAt: fromCenterDateTimeInput(values.registrationOpenAt),
      registrationCloseAt: fromCenterDateTimeInput(values.registrationCloseAt),
      startDate: `${values.startDate}T00:00:00.000Z`,
      endDate: `${addDays(values.startDate, Math.ceil(Number(values.totalSessions) / Number(values.sessionsPerWeek)) * 7 - 1)}T00:00:00.000Z`,
    };
    try {
      const created = await create.mutateAsync(input);
      toast('Đã tạo lớp ở trạng thái bản nháp. Tạo lịch buổi và hoàn thiện dữ liệu trước khi mở đăng ký.');
      onClose();
      navigate(`/app/classes/${created.id}?schedule=1`);
    } catch (error) {
      form.setError('root.server', { message: parseApiError(error).message });
    }
  });
  const closeWhenIdle = () => { if (!pending) onClose(); };
  const fieldError = (name: keyof Values) => errors[name]?.message;

  return (
    <Dialog open onClose={closeWhenIdle} title="Tạo lớp nhóm" description="Lớp mới được tạo ở trạng thái Bản nháp. Trạng thái không được gửi qua form này." size="lg"
      footer={<><Button variant="secondary" onClick={closeWhenIdle} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending} disabled={sports.isPending || sports.isError || coaches.isError}>Tạo bản nháp</Button></>}>
      {sports.isPending ? <ListSkeleton rows={3} label="Đang tải môn thể thao…" /> :
        sports.isError ? <InlineAlert>Không tải được dữ liệu bắt buộc: {parseApiError(sports.error).message}</InlineAlert> : (
          <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field id="new-class-sport" label="Môn thể thao" required error={fieldError('sportId')}>
              <select id="new-class-sport" className={inputClass} {...form.register('sportId')}><option value="">Chọn môn đang hoạt động</option>{sports.data?.filter((sport) => sport.isActive).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}</select>
            </Field>
            <Field id="new-class-coach" label="Coach" required error={fieldError('coachId')}>
              <CoachPicker
                id="new-class-coach"
                coaches={coaches.data ?? []}
                value={form.watch('coachId')}
                placeholder={!sportId ? 'Chọn môn trước' : coaches.isPending ? 'Đang tải Coach phù hợp…' : 'Chọn Coach đúng chuyên môn'}
                disabled={!sportId || coaches.isPending}
                invalid={Boolean(fieldError('coachId'))}
                onChange={(coachId) => form.setValue('coachId', coachId, { shouldDirty: true, shouldValidate: true })}
              />
              {sportId > 0 && !coaches.isPending && coaches.data?.length === 0 && <p className="mt-2 text-xs font-semibold text-orange-700">Chưa có Coach đang hoạt động được phân công chuyên môn này.</p>}
            </Field>
            <Field id="new-class-name" label="Tên lớp" required error={fieldError('name')} className="sm:col-span-2"><input id="new-class-name" className={inputClass} {...form.register('name')} /></Field>
            <Field id="new-class-description" label="Mô tả" className="sm:col-span-2"><textarea id="new-class-description" className={textareaClass} {...form.register('description')} /></Field>
            <Field id="new-class-capacity" label="Sức chứa" required error={fieldError('capacity')}><input id="new-class-capacity" type="number" min="1" step="1" className={inputClass} {...form.register('capacity')} /></Field>
            <Field id="new-class-total" label="Tổng số buổi" required error={fieldError('totalSessions')}><input id="new-class-total" type="number" min="1" step="1" className={inputClass} {...form.register('totalSessions')} /></Field>
            <Field id="new-class-weekly" label="Số buổi mỗi tuần" required error={fieldError('sessionsPerWeek')}><input id="new-class-weekly" type="number" min="1" step="1" className={inputClass} {...form.register('sessionsPerWeek')} /></Field>
            <Field id="new-class-fee" label="Học phí (₫)" required error={fieldError('tuitionFee')}><CurrencyInput id="new-class-fee" className={inputClass} value={form.watch('tuitionFee')} onValueChange={(value) => form.setValue('tuitionFee', value, { shouldDirty: true, shouldValidate: true })} /></Field>
            <Field id="new-class-open" label="Mở đăng ký" required error={fieldError('registrationOpenAt')}><DateTimeInput id="new-class-open" className={inputClass} value={form.watch('registrationOpenAt')} onValueChange={(value) => form.setValue('registrationOpenAt', value, { shouldDirty: true, shouldValidate: true })} /></Field>
            <Field id="new-class-close" label="Đóng đăng ký" required error={fieldError('registrationCloseAt')}><DateTimeInput id="new-class-close" className={inputClass} value={form.watch('registrationCloseAt')} onValueChange={(value) => form.setValue('registrationCloseAt', value, { shouldDirty: true, shouldValidate: true })} /></Field>
            <Field id="new-class-start" label="Ngày bắt đầu lớp" required error={fieldError('startDate')}><DateInput id="new-class-start" className={inputClass} value={form.watch('startDate')} onValueChange={(value) => form.setValue('startDate', value, { shouldDirty: true, shouldValidate: true })} /></Field>
            <div className="rounded-xl bg-primary/6 px-4 py-3 text-sm text-primary-deep"><strong>Thời hạn dự kiến:</strong> {provisionalEndDate ? formatDate(provisionalEndDate) : 'Chọn ngày bắt đầu và số buổi'}. Ngày kết thúc sẽ khớp buổi cuối sau khi xếp lịch.</div>
            {errors.root?.server?.message && <div className="sm:col-span-2"><InlineAlert>{errors.root.server.message}</InlineAlert></div>}
          </form>
        )}
    </Dialog>
  );
}
