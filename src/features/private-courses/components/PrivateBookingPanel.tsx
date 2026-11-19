import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { RegistrationPayment } from '../../member/components/RegistrationPayment';
import { enrollPrivateBooking, previewPrivateBooking, type PrivateBookingInput, type PrivateBookingPreview } from '../api';
import type { PrivateCourse } from '../types';
import { parseApiError } from '../../training/errors';
import { formatDate } from '../../training/format';
import { useMyClassRegistrations } from '../../member/bookingHooks';
import { useMyPrivateEnrollments } from '../hooks/usePrivateCourses';
import { findPrivateBookingConflicts } from '../privateBookingConflicts';

const shifts = [
  ['S1', '07:00', '08:30'], ['S2', '09:00', '10:30'], ['S3', '11:00', '12:30'],
  ['S4', '13:30', '15:00'], ['S5', '15:30', '17:00'], ['S6', '17:30', '19:00'], ['S7', '19:30', '21:00'],
] as const;
const days = [1, 2, 3, 4, 5, 6, 0];
const labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const vnDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const money = (value: string | number) => `${Number(value).toLocaleString('vi-VN')} ₫`;

export function PrivateBookingPanel({ course }: { course: PrivateCourse }) {
  const [coachId, setCoachId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(vnDate);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<PrivateBookingPreview | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enrollments = useMyPrivateEnrollments();
  const registrations = useMyClassRegistrations();
  const conflicts = useMemo(() => registrations.data && enrollments.data
    ? findPrivateBookingConflicts(course, startDate, shifts.map(([code, start, end]) => ({ code, start, end })), selected, registrations.data, enrollments.data)
    : new Map(), [course, startDate, selected, registrations.data, enrollments.data]);
  const selectedConflicts = selected.flatMap((key) => conflicts.get(key) ?? []);
  const checkingSchedule = registrations.isPending || enrollments.isPending;
  const scheduleError = registrations.isError || enrollments.isError;
  const existing = enrollments.data?.find((entry) => entry.privateCourseId === course.id && ['ACTIVE', 'PENDING_PAYMENT'].includes(entry.status));
  const coach = course.coaches.find((item) => item.coachId === coachId);
  const input = (): PrivateBookingInput => ({ coachId: coachId!, startDate, schedules: selected.map((key) => { const [dayOfWeek, shiftCode] = key.split(':'); return { dayOfWeek: Number(dayOfWeek), shiftCode }; }) });
  const toggle = (key: string) => { setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); setPreview(null); setError(''); };
  const available = (day: number, start: string, end: string) => coach?.coach.availabilities.some((slot) => slot.status === 'AVAILABLE' && slot.dayOfWeek === day && slot.startTime.slice(11, 16) <= start && slot.endTime.slice(11, 16) >= end && slot.effectiveFrom.slice(0, 10) <= startDate && (!slot.effectiveTo || slot.effectiveTo.slice(0, 10) >= startDate));
  const visibleConflicts = [...conflicts.entries()].filter(([key]) => { const [day, code] = key.split(':'); const shift = shifts.find(([item]) => item === code); return shift && available(Number(day), shift[1], shift[2]); });
  const showPreview = async () => {
    setBusy(true); setError('');
    try { if (checkingSchedule || scheduleError || selectedConflicts.length) return; setPreview(await previewPrivateBooking(course.id, input())); }
    catch (cause) { setPreview(null); setError(parseApiError(cause).message); }
    finally { setBusy(false); }
  };
  const register = async () => {
    setBusy(true); setError('');
    try { if (checkingSchedule || scheduleError || selectedConflicts.length) return; const result = await enrollPrivateBooking(course.id, input()); setOrderId(result.order.id); setPreview(null); await enrollments.refetch(); }
    catch (cause) { setPreview(null); setError(parseApiError(cause).message); }
    finally { setBusy(false); }
  };
  if (course.status !== 'ACTIVE') return null;
  if (existing && orderId === null) return <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-semibold text-ink">Bạn đã đăng ký khóa học này ({existing.status === 'ACTIVE' ? 'đang học' : 'đang chờ thanh toán'}). Xem trong Lịch của tôi để tiếp tục.</div>;
  return <div className="mt-6 rounded-2xl border border-primary/20 bg-white p-4 shadow-sm sm:p-6">
    <h3 className="text-lg font-extrabold text-ink">Chọn Coach và ca học</h3>
    <p className="mt-1 text-sm text-muted">Chọn các ca lặp mỗi tuần. Hệ thống xếp đủ {course.totalSessions} buổi và tự chọn phòng còn trống.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-bold">Coach
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2" value={coachId ?? ''} onChange={(event) => { setCoachId(Number(event.target.value) || null); setSelected([]); setPreview(null); }}><option value="">Chọn Coach</option>{course.coaches.filter((item) => item.isActive).map((item) => <option value={item.coachId} key={item.coachId}>{item.coach.user.displayName}</option>)}</select>
      </label>
      <label className="flex min-w-48 flex-col gap-1 text-sm font-bold">Bắt đầu từ
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2" type="date" min={vnDate()} value={startDate} onChange={(event) => { setStartDate(event.target.value); setSelected([]); setPreview(null); }} />
      </label>
    </div>
    {coachId && <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200" role="region" aria-label="Chọn lịch học 1–1" tabIndex={0}><table className="w-full min-w-[760px] table-fixed border-collapse text-center text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Ca</th>{labels.map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{shifts.map(([code, start, end]) => <tr key={code} className="border-t border-slate-200"><th className="p-3 text-left">{start}–{end}</th>{days.map((day) => { const key = `${day}:${code}`; const allowed = available(day, start, end); const active = selected.includes(key); const clash = allowed ? conflicts.get(key) : undefined; return <td className="p-1" key={key}><button type="button" disabled={!allowed || (Boolean(clash) && !active)} aria-pressed={active} aria-label={clash ? `${labels[days.indexOf(day)]} ${start}–${end}: Trùng lịch ${clash[0].labels.join(', ')} ngày ${clash[0].date}` : undefined} onClick={() => toggle(key)} className={`min-h-14 w-full rounded-lg px-1 font-bold ${clash ? 'border border-red-300 bg-red-50 text-red-800' : active ? 'bg-primary text-white' : allowed ? 'bg-sky-50 text-primary hover:bg-sky-100' : 'bg-slate-50 text-slate-400'}`}>{clash ? <><span className="block">Trùng lịch</span><span className="block text-[10px] font-medium">{clash[0].labels.join(', ')}</span></> : active ? 'Đã chọn' : allowed ? 'Chọn ca' : 'Không có ca'}</button></td>; })}</tr>)}</tbody></table></div>}
    {checkingSchedule && <p className="mt-3 text-sm text-muted">Đang đối chiếu lịch học của bạn…</p>}
    {scheduleError && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Chưa thể tải lịch học hiện có. Vui lòng thử lại trước khi đăng ký.</p>}
    {visibleConflicts.length > 0 && <div role="note" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><strong>Các ca nền đỏ trùng với lịch học đã xác nhận của bạn:</strong><ul className="mt-2 list-inside list-disc space-y-1">{visibleConflicts.slice(0, 6).map(([key, entries]) => <li key={key}>{labels[days.indexOf(Number(key.split(':')[0]))]} · {shifts.find(([code]) => code === key.split(':')[1])?.slice(1).join('–')} — {entries[0].labels.join(', ')} ({formatDate(entries[0].date)})</li>)}</ul>{visibleConflicts.length > 6 && <p className="mt-1">Còn {visibleConflicts.length - 6} ca trùng khác được đánh dấu trong lịch.</p>}</div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Đã chọn <strong className="text-ink">{selected.length} ca/tuần</strong></p><Button onClick={showPreview} disabled={!coachId || !startDate || !selected.length || checkingSchedule || scheduleError || selectedConflicts.length > 0} loading={busy}>Xem trước lịch học</Button></div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {preview && !checkingSchedule && !scheduleError && selectedConflicts.length === 0 && <div className="mt-5 rounded-xl bg-sky-50 p-4"><h4 className="font-extrabold">Lịch dự kiến · {preview.totalSessions} buổi · {money(preview.price)}</h4><p className="mt-1 text-xs text-muted">Phòng được trung tâm tự xếp. Lịch được kiểm tra lại khi đăng ký.</p><div className="mt-3 grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">{preview.occurrences.map((item, index) => <div key={`${item.startsAt}-${index}`} className="rounded-lg bg-white p-2 text-sm"><strong>Buổi {index + 1}</strong> · {new Date(item.startsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })} · Phòng #{item.roomId}</div>)}</div><div className="mt-4 flex justify-end"><Button onClick={register} loading={busy}>Đăng ký và thanh toán</Button></div></div>}
    <Dialog open={orderId !== null} onClose={() => setOrderId(null)} size="lg" title="Đăng ký thành công" description="Chỗ của bạn được giữ trong thời hạn thanh toán. Chọn phương thức thanh toán để xác nhận khóa học.">{orderId !== null && <RegistrationPayment orderId={orderId} onPaid={() => { setOrderId(null); void enrollments.refetch(); }} />}</Dialog>
  </div>;
}
