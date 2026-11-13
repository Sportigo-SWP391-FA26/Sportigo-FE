import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { PageHeader, Card } from '../../../components/ui/Card';
import { parseApiError } from '../../training/errors';

type Session = { id: number; startsAt: string; status: string; class: { name: string } };
type Absence = {
  id: number; sessionId: number; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewReason: string | null; makeupSessionId: number | null;
  session: { startsAt: string; groupClass: { name: string } };
};
type PrivateSession = { scheduleId: number; sessionDate: string; startsAt: string; name: string; memberId: number };
type PrivateAbsence = { id: number; scheduleId: number; sessionDate: string; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; reviewReason: string | null; makeupStartsAt: string | null; schedule: { enrollment: { privateCourse: { name: string } } } };
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

export function CoachAbsencesPage() {
  const cache = useQueryClient();
  const [reasonById, setReasonById] = useState<Record<number, string>>({});
  const [privateReasons, setPrivateReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [range] = useState(() => ({ from: new Date().toISOString(), to: new Date(Date.now() + 45 * 86_400_000).toISOString() }));
  const sessions = useQuery({ queryKey: ['coach-absence-sessions'], queryFn: async () => (await apiClient.get<Session[]>('/coaches/me/sessions', { params: range })).data });
  const requests = useQuery({ queryKey: ['coach-absences', 'me'], queryFn: async () => (await apiClient.get<{ items: Absence[] }>('/coach-absences/me')).data.items });
  const privateSessions = useQuery({ queryKey: ['coach-absences', 'private-sessions'], queryFn: async () => (await apiClient.get<{ items: PrivateSession[] }>('/coach-absences/private/me/sessions')).data.items });
  const privateRequests = useQuery({ queryKey: ['coach-absences', 'private-me'], queryFn: async () => (await apiClient.get<{ items: PrivateAbsence[] }>('/coach-absences/private/me')).data.items });
  const submit = useMutation({ mutationFn: async (input: { sessionId: number; reason: string }) => apiClient.post('/coach-absences/me', input),
    onSuccess: () => { setError(''); void cache.invalidateQueries({ queryKey: ['coach-absences'] }); } });
  const submitted = new Set((requests.data ?? []).map((item) => item.sessionId));
  const privateSubmitted = new Set((privateRequests.data ?? []).map((item) => `${item.scheduleId}-${item.sessionDate.slice(0, 10)}`));
  const submitPrivate = useMutation({ mutationFn: async (input: { scheduleId: number; sessionDate: string; reason: string }) => apiClient.post('/coach-absences/private/me', input),
    onSuccess: () => { setError(''); void cache.invalidateQueries({ queryKey: ['coach-absences'] }); } });
  return <div className="mx-auto w-full max-w-[1100px] space-y-5">
    <PageHeader eyebrow="Lịch dạy" title="Báo nghỉ buổi học" description="Gửi lý do nghỉ cho buổi chưa bắt đầu. Center Manager sẽ duyệt, thông báo học viên và xếp buổi bù." />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {(sessions.isLoading || requests.isLoading) && <p>Đang tải lịch dạy…</p>}
    {(sessions.isError || requests.isError) && <p role="alert" className="text-red-700">Không tải được lịch. Vui lòng thử lại.</p>}
    {(sessions.data ?? []).filter((item) => item.status === 'SCHEDULED' && !submitted.has(item.id)).map((session) =>
      <Card key={session.id} className="space-y-3 p-5">
        <div><h2 className="font-bold text-ink">{session.class.name}</h2><p className="text-sm text-muted">{dateTime(session.startsAt)}</p></div>
        <label className="block text-sm font-semibold text-ink" htmlFor={`absence-${session.id}`}>Lý do báo nghỉ</label>
        <textarea id={`absence-${session.id}`} className="w-full rounded-xl border border-line p-3" maxLength={300} value={reasonById[session.id] ?? ''} onChange={(event) => setReasonById({ ...reasonById, [session.id]: event.target.value })} />
        <button type="button" className="rounded-xl bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50" disabled={submit.isPending || (reasonById[session.id] ?? '').trim().length < 3}
          onClick={() => submit.mutate({ sessionId: session.id, reason: reasonById[session.id]!.trim() }, { onError: (failure) => setError(parseApiError(failure).message) })}>Gửi báo nghỉ</button>
      </Card>)}
    <h2 className="text-xl font-bold text-ink">Buổi khóa 1–1</h2>
    {(privateSessions.data ?? []).filter((item) => !privateSubmitted.has(`${item.scheduleId}-${item.sessionDate}`)).map((session) => {
      const key = `${session.scheduleId}-${session.sessionDate}`;
      return <Card key={key} className="space-y-3 p-5">
        <div><h3 className="font-bold text-ink">{session.name}</h3><p className="text-sm text-muted">Hội viên #{session.memberId} · {dateTime(session.startsAt)}</p></div>
        <label className="block text-sm font-semibold text-ink" htmlFor={`private-absence-${key}`}>Lý do báo nghỉ</label>
        <textarea id={`private-absence-${key}`} className="w-full rounded-xl border border-line p-3" maxLength={300} value={privateReasons[key] ?? ''} onChange={(event) => setPrivateReasons({ ...privateReasons, [key]: event.target.value })} />
        <button type="button" className="rounded-xl bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50" disabled={submitPrivate.isPending || (privateReasons[key] ?? '').trim().length < 3}
          onClick={() => submitPrivate.mutate({ scheduleId: session.scheduleId, sessionDate: session.sessionDate, reason: privateReasons[key]!.trim() }, { onError: (failure) => setError(parseApiError(failure).message) })}>Gửi báo nghỉ 1–1</button>
      </Card>;
    })}
    <h2 className="text-xl font-bold text-ink">Yêu cầu đã gửi</h2>
    {(requests.data ?? []).map((item) => <Card key={item.id} className="p-5"><strong>{item.session.groupClass.name}</strong><p>{dateTime(item.session.startsAt)} · {item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt, chờ xếp bù' : 'Từ chối'}{item.makeupSessionId ? ' · Đã có buổi bù' : ''}</p><p className="text-sm text-muted">{item.reason}</p>{item.reviewReason && <p className="text-sm text-muted">Phản hồi: {item.reviewReason}</p>}</Card>)}
    {(privateRequests.data ?? []).map((item) => <Card key={`private-${item.id}`} className="p-5"><strong>1–1 · {item.schedule.enrollment.privateCourse.name}</strong><p>{item.sessionDate.slice(0, 10)} · {item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'REJECTED' ? 'Từ chối' : item.makeupStartsAt ? `Học bù ${dateTime(item.makeupStartsAt)}` : 'Chờ xếp bù'}</p><p className="text-sm text-muted">{item.reason}</p>{item.reviewReason && <p className="text-sm text-muted">Phản hồi: {item.reviewReason}</p>}</Card>)}
  </div>;
}
