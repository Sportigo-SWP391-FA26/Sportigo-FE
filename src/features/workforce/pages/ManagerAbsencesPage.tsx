import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { Card, PageHeader } from '../../../components/ui/Card';
import { parseApiError } from '../../training/errors';

type Absence = { id: number; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; makeupSessionId: number | null;
  coach: { user: { displayName: string } }; session: { startsAt: string; endsAt: string; roomId: number; groupClass: { name: string; endDate: string; sportId: number } } };
type PrivateAbsence = { id: number; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; sessionDate: string; originalStartsAt: string; originalEndsAt: string; makeupStartsAt: string | null;
  coach: { user: { displayName: string } }; schedule: { roomId: number; startTime: string; endTime: string; enrollment: { expiryDate: string; privateCourse: { name: string; sportId: number } } } };
type Coach = { id: number; displayName: string; coachCode: string; sports: { id: number }[] };
type Room = { id: number; name: string; capacity: number; status: string };
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
const toLocalInput = (value: string) => { const date = new Date(new Date(value).getTime() + 7 * 3_600_000); return date.toISOString().slice(0, 16); };

export function ManagerAbsencesPage() {
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [privateNotes, setPrivateNotes] = useState<Record<number, string>>({});
  const [slots, setSlots] = useState<Record<number, { coachId: string; roomId: string; startsAt: string; endsAt: string }>>({});
  const [privateSlots, setPrivateSlots] = useState<Record<number, { coachId: string; roomId: string; startsAt: string; endsAt: string }>>({});
  const requests = useQuery({ queryKey: ['coach-absences'], queryFn: async () => (await apiClient.get<{ items: Absence[] }>('/coach-absences')).data.items });
  const privateRequests = useQuery({ queryKey: ['coach-absences', 'private'], queryFn: async () => (await apiClient.get<{ items: PrivateAbsence[] }>('/coach-absences/private')).data.items });
  const coaches = useQuery({ queryKey: ['absence-coaches'], queryFn: async () => (await apiClient.get<{ data: Coach[] }>('/coaches')).data.data });
  const rooms = useQuery({ queryKey: ['absence-rooms'], queryFn: async () => (await apiClient.get<{ data: Room[] }>('/rooms')).data.data });
  const review = useMutation({ mutationFn: async ({ id, approve }: { id: number; approve: boolean }) => apiClient.post(`/coach-absences/${id}/review`, { approve, reason: notes[id] || undefined }),
    onSuccess: () => { setError(''); void cache.invalidateQueries({ queryKey: ['coach-absences'] }); } });
  const makeup = useMutation({ mutationFn: async (id: number) => {
    const slot = slots[id]!;
    return apiClient.post(`/coach-absences/${id}/makeup`, { coachId: Number(slot.coachId), roomId: Number(slot.roomId), startsAt: new Date(`${slot.startsAt}:00+07:00`).toISOString(), endsAt: new Date(`${slot.endsAt}:00+07:00`).toISOString() });
  }, onSuccess: () => { setError(''); void cache.invalidateQueries({ queryKey: ['coach-absences'] }); } });
  const reviewPrivate = useMutation({ mutationFn: async ({ id, approve }: { id: number; approve: boolean }) => apiClient.post(`/coach-absences/private/${id}/review`, { approve, reason: privateNotes[id] || undefined }),
    onSuccess: () => { setError(''); void cache.invalidateQueries({ queryKey: ['coach-absences'] }); } });
  const makeupPrivate = useMutation({ mutationFn: async (id: number) => {
    const slot = privateSlots[id]!;
    return apiClient.post(`/coach-absences/private/${id}/makeup`, { coachId: Number(slot.coachId), roomId: Number(slot.roomId), startsAt: new Date(`${slot.startsAt}:00+07:00`).toISOString(), endsAt: new Date(`${slot.endsAt}:00+07:00`).toISOString() });
  }, onSuccess: () => { setError(''); void cache.invalidateQueries({ queryKey: ['coach-absences'] }); } });
  return <div className="mx-auto w-full max-w-[1100px] space-y-5">
    <PageHeader eyebrow="Nhân sự & lịch học" title="Coach báo nghỉ và buổi bù" description="Duyệt báo nghỉ trước giờ học, sau đó chọn Coach, phòng và lịch bù trong 14 ngày, trước ngày kết thúc lớp." />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {requests.isLoading && <p>Đang tải yêu cầu…</p>}
    {requests.isError && <p role="alert" className="text-red-700">Không tải được yêu cầu.</p>}
    {(requests.data ?? []).map((item) => {
      const slot = slots[item.id] ?? { coachId: '', roomId: String(item.session.roomId), startsAt: toLocalInput(item.session.startsAt), endsAt: toLocalInput(item.session.endsAt) };
      const setSlot = (changes: Partial<typeof slot>) => setSlots({ ...slots, [item.id]: { ...slot, ...changes } });
      return <Card key={item.id} className="space-y-3 p-5">
        <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-ink">{item.session.groupClass.name}</h2><p className="text-sm text-muted">{item.coach.user.displayName} · {dateTime(item.session.startsAt)}</p></div><span className="font-semibold text-primary">{item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'REJECTED' ? 'Đã từ chối' : item.makeupSessionId ? 'Đã xếp bù' : 'Chờ xếp bù'}</span></div>
        <p className="text-sm">Lý do: {item.reason}</p>
        {item.status === 'PENDING' && <div className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-sm">Lý do từ chối (nếu từ chối)<input className="mt-1 w-full rounded-xl border border-line p-2" value={notes[item.id] ?? ''} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} /></label><button className="rounded-xl bg-primary px-4 py-2 text-white" onClick={() => review.mutate({ id: item.id, approve: true }, { onError: (failure) => setError(parseApiError(failure).message) })}>Duyệt và hủy buổi</button><button className="rounded-xl border border-line px-4 py-2" disabled={(notes[item.id] ?? '').trim().length < 3} onClick={() => review.mutate({ id: item.id, approve: false }, { onError: (failure) => setError(parseApiError(failure).message) })}>Từ chối</button></div>}
        {item.status === 'APPROVED' && !item.makeupSessionId && <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <label className="text-sm">Coach đúng chuyên môn<select className="mt-1 w-full rounded-xl border border-line p-2" value={slot.coachId} onChange={(event) => setSlot({ coachId: event.target.value })}><option value="">Chọn Coach</option>{(coaches.data ?? []).filter((coach) => coach.sports.some((sport) => sport.id === item.session.groupClass.sportId)).map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName} · {coach.coachCode}</option>)}</select></label>
          <label className="text-sm">Phòng<select className="mt-1 w-full rounded-xl border border-line p-2" value={slot.roomId} onChange={(event) => setSlot({ roomId: event.target.value })}>{(rooms.data ?? []).filter((room) => room.status === 'AVAILABLE').map((room) => <option key={room.id} value={room.id}>{room.name} · {room.capacity} chỗ</option>)}</select></label>
          <label className="text-sm">Bắt đầu<input type="datetime-local" className="mt-1 w-full rounded-xl border border-line p-2" value={slot.startsAt} onChange={(event) => setSlot({ startsAt: event.target.value })} /></label>
          <label className="text-sm">Kết thúc<input type="datetime-local" className="mt-1 w-full rounded-xl border border-line p-2" value={slot.endsAt} onChange={(event) => setSlot({ endsAt: event.target.value })} /></label>
          <p className="text-sm text-muted sm:col-span-2">Hạn cuối: 14 ngày từ buổi gốc và trước {dateTime(item.session.groupClass.endDate)}.</p>
          <button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={!slot.coachId || !slot.roomId || !slot.startsAt || !slot.endsAt || makeup.isPending} onClick={() => makeup.mutate(item.id, { onError: (failure) => setError(parseApiError(failure).message) })}>Xếp buổi bù</button>
        </div>}
      </Card>;
    })}
    <h2 className="text-xl font-bold text-ink">Khóa 1–1 · yêu cầu báo nghỉ</h2>
    {privateRequests.isLoading && <p>Đang tải yêu cầu 1–1…</p>}
    {privateRequests.isError && <p role="alert" className="text-red-700">Không tải được yêu cầu 1–1.</p>}
    {(privateRequests.data ?? []).map((item) => {
      const original = item.originalStartsAt;
      const originalEnd = item.originalEndsAt;
      const slot = privateSlots[item.id] ?? { coachId: '', roomId: String(item.schedule.roomId), startsAt: toLocalInput(original), endsAt: toLocalInput(originalEnd) };
      const setSlot = (changes: Partial<typeof slot>) => setPrivateSlots({ ...privateSlots, [item.id]: { ...slot, ...changes } });
      return <Card key={`private-${item.id}`} className="space-y-3 p-5">
        <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-ink">1–1 · {item.schedule.enrollment.privateCourse.name}</h3><p className="text-sm text-muted">{item.coach.user.displayName} · {item.sessionDate.slice(0, 10)}</p></div><span className="font-semibold text-primary">{item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'REJECTED' ? 'Đã từ chối' : item.makeupStartsAt ? 'Đã xếp bù' : 'Chờ xếp bù'}</span></div>
        <p className="text-sm">Lý do: {item.reason}</p>
        {item.status === 'PENDING' && <div className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-sm">Lý do từ chối (nếu từ chối)<input className="mt-1 w-full rounded-xl border border-line p-2" value={privateNotes[item.id] ?? ''} onChange={(event) => setPrivateNotes({ ...privateNotes, [item.id]: event.target.value })} /></label><button className="rounded-xl bg-primary px-4 py-2 text-white" onClick={() => reviewPrivate.mutate({ id: item.id, approve: true }, { onError: (failure) => setError(parseApiError(failure).message) })}>Duyệt và hủy buổi</button><button className="rounded-xl border border-line px-4 py-2" disabled={(privateNotes[item.id] ?? '').trim().length < 3} onClick={() => reviewPrivate.mutate({ id: item.id, approve: false }, { onError: (failure) => setError(parseApiError(failure).message) })}>Từ chối</button></div>}
        {item.status === 'APPROVED' && !item.makeupStartsAt && <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <label className="text-sm">Coach đúng chuyên môn<select className="mt-1 w-full rounded-xl border border-line p-2" value={slot.coachId} onChange={(event) => setSlot({ coachId: event.target.value })}><option value="">Chọn Coach</option>{(coaches.data ?? []).filter((coach) => coach.sports.some((sport) => sport.id === item.schedule.enrollment.privateCourse.sportId)).map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName} · {coach.coachCode}</option>)}</select></label>
          <label className="text-sm">Phòng<select className="mt-1 w-full rounded-xl border border-line p-2" value={slot.roomId} onChange={(event) => setSlot({ roomId: event.target.value })}>{(rooms.data ?? []).filter((room) => room.status === 'AVAILABLE').map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
          <label className="text-sm">Bắt đầu<input type="datetime-local" className="mt-1 w-full rounded-xl border border-line p-2" value={slot.startsAt} onChange={(event) => setSlot({ startsAt: event.target.value })} /></label>
          <label className="text-sm">Kết thúc<input type="datetime-local" className="mt-1 w-full rounded-xl border border-line p-2" value={slot.endsAt} onChange={(event) => setSlot({ endsAt: event.target.value })} /></label>
          <p className="text-sm text-muted sm:col-span-2">Buổi bù trong 14 ngày, trước khi khóa hết hạn {item.schedule.enrollment.expiryDate.slice(0, 10)}.</p>
          <button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={!slot.coachId || !slot.roomId || !slot.startsAt || !slot.endsAt || makeupPrivate.isPending} onClick={() => makeupPrivate.mutate(item.id, { onError: (failure) => setError(parseApiError(failure).message) })}>Xếp buổi bù 1–1</button>
        </div>}
      </Card>;
    })}
  </div>;
}
