import { ArrowLeft, Clock, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { getSessionRole } from '../../../components/auth/session';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { WeeklyTimetable } from '../../../components/schedule/WeeklyTimetable';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { formatDate } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { usePrivateCourse, useUpdatePrivateCourse } from '../hooks/usePrivateCourses';
import type { PrivateCourse } from '../types';

const clock = (value: string) => value.slice(11, 16);

export function PrivateCourseDetailPage() {
  const courseId = Number(useParams().courseId);
  const course = usePrivateCourse(courseId);
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const basePath = isManager ? '/app/private-courses' : '/member/private-courses';
  const [editing, setEditing] = useState(false);
  const frameClass = `mx-auto w-full max-w-[1100px] ${isManager ? '' : 'px-4 py-8 sm:px-6 lg:py-10'}`;

  if (!Number.isInteger(courseId) || courseId <= 0) return <ErrorState error={new Error('ID khóa học không hợp lệ.')} />;
  if (course.isPending) return <div className={frameClass}><ListSkeleton label="Đang tải chi tiết khóa học…" /></div>;
  if (course.isError) return <div className={frameClass}><ErrorState error={course.error} onRetry={() => course.refetch()} retrying={course.isRefetching} pendingApi="GET /api/private-courses/:id" /></div>;
  if (!course.data) return <div className={frameClass}><EmptyState title="Không tìm thấy khóa học" description="Khóa học có thể không còn tồn tại hoặc đã bị gỡ." /></div>;

  const item = course.data;
  const coaches = item.coaches.filter((assignment) => assignment.isActive);
  return (
    <div className={frameClass}>
      <PageHeader
        eyebrow="Chi tiết khóa 1–1"
        title={item.name}
        description={item.description ?? 'Thông tin khóa học và Coach được phân công.'}
        back={<Link to={basePath} className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-primary-deep hover:underline"><ArrowLeft aria-hidden="true" /> Danh sách khóa học</Link>}
        actions={isManager ? <Button icon={<PencilSimple />} onClick={() => setEditing(true)}>Sửa khóa học</Button> : undefined}
      />
      <div className="relative mb-6 aspect-[21/7] min-h-52 overflow-hidden rounded-card bg-primary/10">
        {item.sport.imageUrl ? <img src={item.sport.imageUrl} alt={`Minh họa ${item.name}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-lg font-extrabold text-primary-deep">{item.sport.name}</div>}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-200">Khóa 1–1 · {item.sport.name}</p><p className="mt-2 max-w-2xl text-2xl font-extrabold sm:text-3xl">{item.name}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="text-xs font-bold text-muted">Môn thể thao</p><p className="mt-1 text-lg font-extrabold">{item.sport.name}</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Học phí</p><p className="mt-1 text-lg font-extrabold">{new Intl.NumberFormat('vi-VN').format(Number(item.price))} ₫</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Số buổi</p><p className="mt-1 text-lg font-extrabold">{item.totalSessions} buổi</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Thời hạn khóa</p><p className="mt-1 text-lg font-extrabold">{item.validityDays} ngày</p><p className="text-xs text-muted">{item.sessionDurationMinutes} phút mỗi buổi</p></Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeading title="Coach được phân công" description="Availability hiển thị theo dữ liệu lịch khả dụng mà API trả về." />
        {coaches.length === 0 ? (
          <EmptyState compact title="Chưa có Coach được phân công" description="Vui lòng liên hệ trung tâm để biết thêm thông tin." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {coaches.map((assignment) => {
              const availability = assignment.coach.availabilities.filter((slot) => slot.status === 'AVAILABLE');
              return (
                <article key={assignment.coachId} className="rounded-card border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">{assignment.coach.user.avatarUrl ? <img src={assignment.coach.user.avatarUrl} alt={`Coach ${assignment.coach.user.displayName}`} className="size-12 rounded-xl object-cover" /> : <span className="grid size-12 place-items-center rounded-xl bg-primary/10 font-extrabold text-primary">{assignment.coach.user.displayName.slice(0, 1)}</span>}<h3 className="font-extrabold text-ink">{assignment.coach.user.displayName}</h3></div>
                    <Chip tone="success" dot>Được phân công</Chip>
                  </div>
                  {assignment.customPrice !== null && <p className="mt-2 text-sm text-muted">Giá áp dụng với Coach này: <strong className="text-ink">{new Intl.NumberFormat('vi-VN').format(Number(assignment.customPrice))} ₫</strong></p>}
                  <h4 className="mt-4 flex items-center gap-2 text-sm font-bold text-ink"><Clock aria-hidden="true" /> Availability</h4>
                  {availability.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">API không trả khung availability đang hoạt động.</p>
                  ) : (
                    <div className="mt-3"><WeeklyTimetable items={availability.map((slot) => ({ id: slot.id, dayOfWeek: slot.dayOfWeek, time: `${clock(slot.startTime)}–${clock(slot.endTime)}`, title: 'Có thể nhận lịch', subtitle: `${formatDate(slot.effectiveFrom)} – ${slot.effectiveTo ? formatDate(slot.effectiveTo) : 'Không giới hạn'}`, tone: 'primary' }))} /></div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Card>
      {editing && <EditPrivateCourseDialog course={item} onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditPrivateCourseDialog({ course, onClose }: { course: PrivateCourse; onClose: () => void }) {
  const update = useUpdatePrivateCourse(course.id);
  const [values, setValues] = useState({ name: course.name, description: course.description ?? '', totalSessions: String(course.totalSessions), sessionDurationMinutes: String(course.sessionDurationMinutes), validityDays: String(course.validityDays), price: String(course.price), status: course.status });
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    const totalSessions = Number(values.totalSessions); const sessionDurationMinutes = Number(values.sessionDurationMinutes); const validityDays = Number(values.validityDays); const price = Number(values.price);
    if (!values.name.trim() || totalSessions < 2 || sessionDurationMinutes <= 0 || validityDays <= 0 || price <= 0) { toast('Thông tin khóa học chưa hợp lệ.', 'error'); return; }
    try {
      await update.mutateAsync({ name: values.name.trim(), description: values.description.trim() || null, totalSessions, sessionDurationMinutes, validityDays, price, status: values.status });
      toast('Đã cập nhật khóa học 1–1.'); onClose();
    } catch (error) { toast(parseApiError(error).message, 'error'); }
  };
  return <Dialog open onClose={() => { if (!update.isPending) onClose(); }} size="lg" title="Sửa khóa học 1–1" description={`Môn ${course.sport.name} · Ảnh minh họa lấy từ ảnh bộ môn.`} footer={<><Button variant="secondary" onClick={onClose} disabled={update.isPending}>Đóng</Button><Button onClick={submit} loading={update.isPending}>Lưu thay đổi</Button></>}><div className="grid gap-4 sm:grid-cols-2"><Field id="private-name" label="Tên khóa học" required className="sm:col-span-2"><input id="private-name" className={inputClass} value={values.name} onChange={(event) => set('name', event.target.value)} /></Field><Field id="private-description" label="Mô tả" className="sm:col-span-2"><textarea id="private-description" className={textareaClass} value={values.description} onChange={(event) => set('description', event.target.value)} /></Field><Field id="private-sessions" label="Tổng số buổi" required><input id="private-sessions" type="number" min="2" className={inputClass} value={values.totalSessions} onChange={(event) => set('totalSessions', event.target.value)} /></Field><Field id="private-duration" label="Phút mỗi buổi" required><input id="private-duration" type="number" min="1" className={inputClass} value={values.sessionDurationMinutes} onChange={(event) => set('sessionDurationMinutes', event.target.value)} /></Field><Field id="private-validity" label="Thời hạn (ngày)" required><input id="private-validity" type="number" min="1" className={inputClass} value={values.validityDays} onChange={(event) => set('validityDays', event.target.value)} /></Field><Field id="private-price" label="Học phí (₫)" required><input id="private-price" type="number" min="1" className={inputClass} value={values.price} onChange={(event) => set('price', event.target.value)} /></Field><Field id="private-status" label="Trạng thái"><select id="private-status" className={inputClass} value={values.status} onChange={(event) => set('status', event.target.value)}><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Tạm ngưng</option><option value="ARCHIVED">Lưu trữ</option></select></Field></div></Dialog>;
}
