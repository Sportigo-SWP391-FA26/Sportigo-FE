import { BookOpenText, Plus } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { getSessionRole } from '../../../components/auth/session';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { getSports } from '../../catalog/api';
import { parseApiError, retryServerErrors } from '../../training/errors';
import { trainingKeys } from '../../training/queryKeys';
import { useCreatePrivateCourse, useDeletePrivateCourse, usePrivateCourses, useUpdatePrivateCourse } from '../hooks/usePrivateCourses';

function PrivateCourseActions({ courseId, name, status }: { courseId: number; name: string; status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' }) {
  const [action, setAction] = useState<'close' | 'delete' | null>(null);
  const update = useUpdatePrivateCourse(courseId);
  const remove = useDeletePrivateCourse();
  const confirm = async () => {
    if (!action) return;
    try {
      if (action === 'delete') await remove.mutateAsync(courseId);
      else await update.mutateAsync({ status: 'INACTIVE' });
      toast(action === 'delete' ? 'Đã xóa bản nháp khóa 1–1.' : 'Đã đóng khóa 1–1.');
      setAction(null);
    } catch (error) { toast(parseApiError(error).message, 'error'); }
  };
  return <>
    {status === 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => setAction('close')}>Đóng khóa</Button>}
    {status === 'DRAFT' && <Button size="sm" variant="secondary" onClick={() => setAction('delete')}>Xóa bản nháp</Button>}
    {action && <Dialog open onClose={() => setAction(null)} title={action === 'delete' ? 'Xóa bản nháp khóa 1–1?' : 'Đóng khóa 1–1?'} description={`${name} · ${action === 'delete' ? 'Chỉ xóa được khóa chưa có người đăng ký.' : 'Không nhận đăng ký mới; các enrollment và lịch đã có được giữ lại.'}`} footer={<><Button variant="secondary" onClick={() => setAction(null)}>Quay lại</Button><Button onClick={confirm} loading={update.isPending || remove.isPending}>{action === 'delete' ? 'Xóa khóa' : 'Đóng khóa'}</Button></>}><p className="text-sm text-muted">{action === 'delete' ? 'Thao tác xóa bản nháp không thể hoàn tác.' : 'Có thể kích hoạt lại khóa trong trang chi tiết.'}</p></Dialog>}
  </>;
}

export function PrivateCoursesPage() {
  const courses = usePrivateCourses();
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const [creating, setCreating] = useState(false);
  const basePath = isManager ? '/app/private-courses' : '/member/private-courses';
  return (
    <div className={`mx-auto w-full max-w-[1100px] ${isManager ? '' : 'px-4 py-8 sm:px-6 lg:py-10'}`}>
      <PageHeader eyebrow="Khóa học cá nhân" title="Khóa học 1–1" description="Xem nội dung khóa học, môn thể thao, học phí và Coach được phân công." actions={isManager ? <Button icon={<Plus />} onClick={() => setCreating(true)}>Tạo khóa 1–1</Button> : undefined} />
      {courses.isPending ? (
        <ListSkeleton label="Đang tải khóa học…" />
      ) : courses.isError ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} retrying={courses.isRefetching} pendingApi="GET /api/private-courses" />
      ) : courses.data.length === 0 ? (
        <EmptyState icon={<BookOpenText />} title="Chưa có khóa học đang mở" description="Hiện chưa có khóa học 1–1 nào khả dụng." action={isManager ? <Button onClick={() => setCreating(true)}>Tạo khóa 1–1</Button> : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.data.map((course) => (
            <Card key={course.id} className="group overflow-hidden p-0">
              <div className="relative aspect-[16/8] overflow-hidden bg-primary/8">
                {course.sport.imageUrl ? <img src={course.sport.imageUrl} alt={`Khóa ${course.name}`} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid size-full place-items-center text-primary"><BookOpenText size={42} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
                <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-deep backdrop-blur">{course.sport.name}</span>
              </div>
              <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-extrabold text-ink">{course.name}</h2>
                <Chip tone={course.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{course.status === 'ACTIVE' ? 'Đang hoạt động' : course.status === 'DRAFT' ? 'Bản nháp' : course.status === 'INACTIVE' ? 'Đã đóng' : 'Đã lưu trữ'}</Chip>
              </div>
              {course.description && <p className="mt-3 line-clamp-3 text-sm text-muted">{course.description}</p>}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs text-muted">Học phí</p><p className="text-xl font-extrabold text-ink">{new Intl.NumberFormat('vi-VN').format(Number(course.price))} ₫</p><p className="text-xs text-muted">{course.totalSessions} buổi · {course.sessionDurationMinutes} phút/buổi</p></div>
                <Link to={`${basePath}/${course.id}`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-sm font-bold text-white hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Chi tiết khóa học</Link>
                {isManager && <PrivateCourseActions courseId={course.id} name={course.name} status={course.status} />}
              </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {creating && <CreatePrivateCourseDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreatePrivateCourseDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreatePrivateCourse();
  const sports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: retryServerErrors });
  const [values, setValues] = useState({ sportId: '', name: '', description: '', totalSessions: '12', sessionDurationMinutes: '90', validityDays: '90', price: '' });
  const [error, setError] = useState('');
  const set = (key: keyof typeof values, value: string) => { setValues((current) => ({ ...current, [key]: value })); setError(''); };
  const submit = async () => {
    const sportId = Number(values.sportId);
    const totalSessions = Number(values.totalSessions);
    const sessionDurationMinutes = Number(values.sessionDurationMinutes);
    const validityDays = Number(values.validityDays);
    const price = Number(values.price);
    if (!Number.isInteger(sportId) || sportId <= 0 || !values.name.trim() || !Number.isInteger(totalSessions) || totalSessions < 2 || !Number.isInteger(sessionDurationMinutes) || sessionDurationMinutes <= 0 || !Number.isInteger(validityDays) || validityDays <= 0 || !Number.isFinite(price) || price <= 0) {
      setError('Chọn môn và nhập tên, ít nhất 2 buổi, thời lượng, thời hạn và học phí hợp lệ.');
      return;
    }
    try {
      const course = await create.mutateAsync({ sportId, name: values.name.trim(), description: values.description.trim() || null, totalSessions, sessionDurationMinutes, validityDays, price });
      toast('Đã tạo bản nháp khóa 1–1. Hãy phân công Coach đúng chuyên môn.');
      onClose();
      navigate(`/app/private-courses/${course.id}`);
    } catch (cause) { setError(parseApiError(cause).message); }
  };
  return <Dialog open onClose={() => { if (!create.isPending) onClose(); }} size="lg" title="Tạo khóa học 1–1" description="Khóa mới ở trạng thái Bản nháp. Phân công Coach tại trang chi tiết trước khi mở bán." footer={<><Button variant="secondary" onClick={onClose} disabled={create.isPending}>Đóng</Button><Button onClick={submit} loading={create.isPending} disabled={sports.isPending || sports.isError}>Tạo bản nháp</Button></>}>
    {sports.isPending ? <ListSkeleton rows={3} label="Đang tải bộ môn…" /> : sports.isError ? <InlineAlert>Không tải được bộ môn: {parseApiError(sports.error).message}</InlineAlert> : <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <Field id="new-private-sport" label="Môn thể thao" required><select id="new-private-sport" className={inputClass} value={values.sportId} onChange={(event) => set('sportId', event.target.value)}><option value="">Chọn môn</option>{sports.data?.filter((sport) => sport.isActive).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}</select></Field>
      <Field id="new-private-name" label="Tên khóa học" required><input id="new-private-name" className={inputClass} value={values.name} onChange={(event) => set('name', event.target.value)} /></Field>
      <Field id="new-private-description" label="Mô tả" className="sm:col-span-2"><textarea id="new-private-description" className={textareaClass} value={values.description} onChange={(event) => set('description', event.target.value)} /></Field>
      <Field id="new-private-sessions" label="Tổng số buổi" required><input id="new-private-sessions" type="number" min="2" step="1" className={inputClass} value={values.totalSessions} onChange={(event) => set('totalSessions', event.target.value)} /></Field>
      <Field id="new-private-duration" label="Phút mỗi buổi" required><input id="new-private-duration" type="number" min="1" step="1" className={inputClass} value={values.sessionDurationMinutes} onChange={(event) => set('sessionDurationMinutes', event.target.value)} /></Field>
      <Field id="new-private-validity" label="Thời hạn khóa (ngày)" required><input id="new-private-validity" type="number" min="1" step="1" className={inputClass} value={values.validityDays} onChange={(event) => set('validityDays', event.target.value)} /></Field>
      <Field id="new-private-price" label="Học phí (₫)" required><CurrencyInput id="new-private-price" className={inputClass} value={values.price} onValueChange={(value) => set('price', value)} /></Field>
      {error && <div className="sm:col-span-2"><InlineAlert>{error}</InlineAlert></div>}
    </form>}
  </Dialog>;
}
