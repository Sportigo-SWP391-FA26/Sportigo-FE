import { ArrowLeft, PencilSimple, Plus, UserMinus } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';
import { getSessionRole } from '../../../components/auth/session';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { getQualifiedCoaches } from '../../coaches/api';
import { coachKeys } from '../../coaches/hooks/useCoachManagement';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { formatDate } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { usePrivateCourse, usePrivateCourseCoachAssignment, useUpdatePrivateCourse } from '../hooks/usePrivateCourses';
import type { CourseAvailability, PrivateCourse } from '../types';

const clock = (value: string) => value.slice(11, 16);
const weekDays = [1, 2, 3, 4, 5, 6, 0];
const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const coachColors = ['blue', 'orange', 'green', 'violet', 'cyan', 'rose'];

function CoachTimetable({ availability, color }: { availability: CourseAvailability[]; color: string }) {
  const times = [...new Set(availability.map((slot) => `${clock(slot.startTime)}–${clock(slot.endTime)}`))].sort();
  if (!times.length) return <p className="mt-4 text-sm text-muted">Coach chưa có lịch khả dụng đã duyệt. Hội viên chưa thể chọn giờ với Coach này.</p>;
  return (
    <div className="private-coach-timetable-scroll mt-4" role="region" aria-label="Thời khóa biểu Coach" tabIndex={0}>
      <table className="private-coach-timetable">
        <thead><tr><th scope="col">Ca học</th>{dayLabels.map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
        <tbody>{times.map((time) => <tr key={time}><th scope="row">{time}</th>{weekDays.map((day) => {
          const slots = availability.filter((slot) => slot.dayOfWeek === day && `${clock(slot.startTime)}–${clock(slot.endTime)}` === time);
          return <td key={day}>{slots.map((slot) => <div key={slot.id} className={`private-coach-slot private-coach-slot--${color}`}><strong>Có thể dạy</strong><small>{formatDate(slot.effectiveFrom)} – {slot.effectiveTo ? formatDate(slot.effectiveTo) : 'không giới hạn'}</small></div>)}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function PrivateCourseDetailPage() {
  const courseId = Number(useParams().courseId);
  const course = usePrivateCourse(courseId);
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const basePath = isManager ? '/app/private-courses' : '/member/private-courses';
  const [editing, setEditing] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const qualifiedCoaches = useQuery({ queryKey: coachKeys.qualified(course.data?.sportId), queryFn: () => getQualifiedCoaches(course.data!.sportId), enabled: isManager && Boolean(course.data) });
  const coachAssignment = usePrivateCourseCoachAssignment(courseId);
  const frameClass = `mx-auto w-full max-w-[1400px] ${isManager ? '' : 'px-4 py-8 sm:px-6 lg:py-10'}`;

  if (!Number.isInteger(courseId) || courseId <= 0) return <ErrorState error={new Error('ID khóa học không hợp lệ.')} />;
  if (course.isPending) return <div className={frameClass}><ListSkeleton label="Đang tải chi tiết khóa học…" /></div>;
  if (course.isError) return <div className={frameClass}><ErrorState error={course.error} onRetry={() => course.refetch()} retrying={course.isRefetching} pendingApi="GET /api/private-courses/:id" /></div>;
  if (!course.data) return <div className={frameClass}><EmptyState title="Không tìm thấy khóa học" description="Khóa học có thể không còn tồn tại hoặc đã bị gỡ." /></div>;

  const item = course.data;
  const coaches = item.coaches.filter((assignment) => assignment.isActive);
  const availableCoaches = qualifiedCoaches.data?.filter((coach) => !coaches.some((assignment) => assignment.coachId === coach.id)) ?? [];
  const addCoach = async () => {
    if (!selectedCoachId) return;
    try { await coachAssignment.assign.mutateAsync(Number(selectedCoachId)); setSelectedCoachId(''); toast('Đã thêm Coach vào khóa học.'); }
    catch (error) { toast(parseApiError(error).message, 'error'); }
  };
  const removeCoach = async (coachId: number) => {
    try { await coachAssignment.unassign.mutateAsync(coachId); toast('Đã ngừng phân công Coach.'); }
    catch (error) { toast(parseApiError(error).message, 'error'); }
  };
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
        <SectionHeading title="Coach của khóa học" description="Hội viên chọn một Coach trong danh sách này, sau đó chọn các ca phù hợp khi đăng ký." />
        {isManager && <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-canvas p-4"><Field id="private-course-coach" label="Thêm Coach đúng chuyên môn" className="min-w-56 flex-1"><select id="private-course-coach" className={inputClass} value={selectedCoachId} onChange={(event) => setSelectedCoachId(event.target.value)} disabled={qualifiedCoaches.isPending || coachAssignment.assign.isPending}><option value="">{qualifiedCoaches.isPending ? 'Đang tải Coach…' : 'Chọn Coach'}</option>{availableCoaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName} · {coach.coachCode}</option>)}</select></Field><Button icon={<Plus />} onClick={addCoach} disabled={!selectedCoachId} loading={coachAssignment.assign.isPending}>Thêm Coach</Button>{qualifiedCoaches.isError && <p className="w-full text-sm text-red-700">Không tải được Coach phù hợp. Hãy thử tải lại trang.</p>}{qualifiedCoaches.isSuccess && availableCoaches.length === 0 && <p className="w-full text-sm text-muted">Không còn Coach phù hợp để thêm. Hãy kiểm tra chuyên môn trong hồ sơ Coach.</p>}</div>}
        {coaches.length === 0 ? (
          <EmptyState compact title="Chưa có Coach được phân công" description="Vui lòng liên hệ trung tâm để biết thêm thông tin." />
        ) : (
          <div className="grid gap-5">
            {coaches.map((assignment, index) => {
              const availability = (assignment.coach.availabilities ?? []).filter((slot) => slot.status === 'AVAILABLE');
              return (
                <article key={assignment.coachId} className={`private-coach-schedule private-coach-schedule--${coachColors[index % coachColors.length]}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">{assignment.coach.user.avatarUrl ? <img src={assignment.coach.user.avatarUrl} alt={`Coach ${assignment.coach.user.displayName}`} className="size-12 rounded-xl object-cover" /> : <span className="grid size-12 place-items-center rounded-xl bg-primary/10 font-extrabold text-primary">{assignment.coach.user.displayName.slice(0, 1)}</span>}<h3 className="font-extrabold text-ink">{assignment.coach.user.displayName}</h3></div>
                    <Chip tone="success" dot>Được phân công</Chip>
                  </div>
                  {assignment.customPrice !== null && <p className="mt-2 text-sm text-muted">Giá áp dụng với Coach này: <strong className="text-ink">{new Intl.NumberFormat('vi-VN').format(Number(assignment.customPrice))} ₫</strong></p>}
                  <h4 className="mt-5 text-sm font-bold text-ink">Lịch có thể nhận học viên · {availability.length} ca</h4>
                  <CoachTimetable availability={availability} color={coachColors[index % coachColors.length]} />
                  {isManager && <Button size="sm" variant="secondary" icon={<UserMinus />} className="mt-4" disabled={coachAssignment.unassign.isPending} onClick={() => removeCoach(assignment.coachId)}>Ngừng phân công</Button>}
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
  return <Dialog open onClose={() => { if (!update.isPending) onClose(); }} size="lg" title="Sửa khóa học 1–1" description={`Môn ${course.sport.name} · Ảnh minh họa lấy từ ảnh bộ môn.`} footer={<><Button variant="secondary" onClick={onClose} disabled={update.isPending}>Đóng</Button><Button onClick={submit} loading={update.isPending}>Lưu thay đổi</Button></>}><div className="grid gap-4 sm:grid-cols-2"><Field id="private-name" label="Tên khóa học" required className="sm:col-span-2"><input id="private-name" className={inputClass} value={values.name} onChange={(event) => set('name', event.target.value)} /></Field><Field id="private-description" label="Mô tả" className="sm:col-span-2"><textarea id="private-description" className={textareaClass} value={values.description} onChange={(event) => set('description', event.target.value)} /></Field><Field id="private-sessions" label="Tổng số buổi" required><input id="private-sessions" type="number" min="2" className={inputClass} value={values.totalSessions} onChange={(event) => set('totalSessions', event.target.value)} /></Field><Field id="private-duration" label="Phút mỗi buổi" required><input id="private-duration" type="number" min="1" className={inputClass} value={values.sessionDurationMinutes} onChange={(event) => set('sessionDurationMinutes', event.target.value)} /></Field><Field id="private-validity" label="Thời hạn (ngày)" required><input id="private-validity" type="number" min="1" className={inputClass} value={values.validityDays} onChange={(event) => set('validityDays', event.target.value)} /></Field><Field id="private-price" label="Học phí (₫)" required><CurrencyInput id="private-price" className={inputClass} value={values.price} onValueChange={(value) => set('price', value)} /></Field><Field id="private-status" label="Trạng thái"><select id="private-status" className={inputClass} value={values.status} onChange={(event) => set('status', event.target.value)}><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Tạm ngưng</option><option value="ARCHIVED">Lưu trữ</option></select></Field></div></Dialog>;
}
