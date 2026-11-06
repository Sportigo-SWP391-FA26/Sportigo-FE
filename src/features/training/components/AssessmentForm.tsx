import { CalendarCheck, CheckCircle, ClipboardText } from '@phosphor-icons/react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { ErrorState, InlineAlert, Skeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { parseApiError } from '../errors';
import { formatDate, formatTime } from '../format';
import { useAssessableSessions, useCreateAssessment } from '../hooks/useAssessments';
import { traineeLabel } from '../labels';
import type { ProgressAssessment, TraineeMember } from '../types';

type Props = { members: TraineeMember[]; onCreated: (assessment: ProgressAssessment) => void; onCancel: () => void };

export function AssessmentForm({ members, onCreated, onCancel }: Props) {
  const [memberId, setMemberId] = useState<number>();
  const [sessionId, setSessionId] = useState('');
  const [metricValues, setMetricValues] = useState<Record<number, string>>({});
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [score, setScore] = useState('');
  const [nextAssessmentDate, setNextAssessmentDate] = useState('');
  const [error, setError] = useState<string>();
  const sessions = useAssessableSessions(memberId);
  const create = useCreateAssessment();
  const selected = sessions.data?.find((item) => `${item.type}:${item.id}` === sessionId);

  const missingRequired = useMemo(() => selected?.metricDefinitions.some((metric) => metric.isRequired && metricValues[metric.id] === '') ?? false, [selected, metricValues]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(undefined);
    if (!memberId || !selected) return setError('Vui lòng chọn học viên và một buổi học đã hoàn thành.');
    if (!comment.trim()) return setError('Vui lòng nhập nhận xét của Coach.');
    if (missingRequired) return setError('Vui lòng nhập đầy đủ các chỉ số bắt buộc của bộ môn.');
    try {
      onCreated(await create.mutateAsync({
        memberId,
        ...(selected.type === 'GROUP_CLASS' ? { classSessionId: selected.id } : { privateCourseAttendanceId: selected.id }),
        metricValues: selected.metricDefinitions.filter((metric) => metricValues[metric.id] !== '').map((metric) => ({ definitionId: metric.id, value: Number(metricValues[metric.id]) })),
        completedWorkoutPlanItemIds: selected.type === 'PRIVATE_COURSE' ? completedItems : [],
        coachComment: comment.trim(),
        ...(recommendation.trim() && { recommendation: recommendation.trim() }),
        ...(score !== '' && { score: Number(score) }),
        ...(nextAssessmentDate && { nextAssessmentDate }),
      }));
    } catch (cause) { setError(parseApiError(cause).message); }
  }

  return <form onSubmit={submit} className="space-y-6">
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-ink"><CalendarCheck className="text-primary" /> Buổi học cần đánh giá</h2>
      <Field id="assessment-member" label="Học viên" required><select id="assessment-member" className={inputClass} value={memberId ?? ''} onChange={(event) => { setMemberId(Number(event.target.value) || undefined); setSessionId(''); setMetricValues({}); setCompletedItems([]); }}><option value="">Chọn học viên bạn phụ trách</option>{members.map((member) => <option key={member.id} value={member.id}>{traineeLabel(member)}</option>)}</select></Field>
      {!memberId ? null : sessions.isPending ? <Skeleton className="h-24 w-full" /> : sessions.isError ? <ErrorState compact error={sessions.error} onRetry={() => sessions.refetch()} retrying={sessions.isRefetching} /> : sessions.data?.length === 0 ? <InlineAlert>Không có buổi đã hoàn thành, có điểm danh hợp lệ và chưa được đánh giá.</InlineAlert> : <Field id="assessment-session" label="Buổi đã hoàn thành" required><select id="assessment-session" className={inputClass} value={sessionId} onChange={(event) => { const value = event.target.value; const next = sessions.data?.find((item) => `${item.type}:${item.id}` === value); setSessionId(value); setMetricValues(Object.fromEntries((next?.metricDefinitions ?? []).map((metric) => [metric.id, '']))); setCompletedItems([]); }}><option value="">Chọn đúng buổi học</option>{sessions.data?.map((session) => <option key={`${session.type}:${session.id}`} value={`${session.type}:${session.id}`}>{session.type === 'GROUP_CLASS' ? 'Lớp nhóm' : 'Khóa 1–1'} · {session.name} · {formatDate(session.startsAt)} {formatTime(session.startsAt)}</option>)}</select></Field>}
    </section>

    {selected && <>
      <section className="space-y-4 border-t border-line pt-5"><div><h2 className="text-base font-extrabold text-ink">Chỉ số {selected.sport.name}</h2><p className="mt-1 text-sm text-muted">Danh mục chuẩn do Center Manager cấu hình; Coach không thể tự đặt tên chỉ số.</p></div><div className="grid gap-4 sm:grid-cols-2">{selected.metricDefinitions.map((metric) => <Field key={metric.id} id={`metric-${metric.id}`} label={`${metric.name} (${metric.unit})`} required={metric.isRequired} hint={`${metric.minValue}–${metric.maxValue} · ${metric.direction === 'HIGHER_IS_BETTER' ? 'cao hơn tốt hơn' : 'thấp hơn tốt hơn'}`}><input id={`metric-${metric.id}`} type="number" min={Number(metric.minValue)} max={Number(metric.maxValue)} step="any" className={inputClass} value={metricValues[metric.id] ?? ''} onChange={(event) => setMetricValues((current) => ({ ...current, [metric.id]: event.target.value }))} /></Field>)}</div></section>
      {selected.type === 'PRIVATE_COURSE' && selected.completedPlanItems.length > 0 && <section className="space-y-3 border-t border-line pt-5"><h2 className="flex items-center gap-2 text-base font-extrabold text-ink"><ClipboardText className="text-primary" /> Nội dung giáo án hoàn thành</h2><p className="text-sm text-muted">Tích các mục thực tế đã hoàn thành trong buổi này. Đánh giá và tiến độ được lưu nguyên tử.</p><div className="grid gap-2 sm:grid-cols-2">{selected.completedPlanItems.map((item) => <label key={item.id} className="flex cursor-pointer gap-3 rounded-2xl border border-line p-3 hover:border-primary/40"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={completedItems.includes(item.id)} onChange={() => setCompletedItems((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span><strong className="block text-sm text-ink">Tuần {item.weekNumber} · Buổi {item.sessionNumber}: {item.title}</strong><span className="mt-1 block text-xs text-muted">{item.content}</span></span></label>)}</div></section>}
      <section className="space-y-4 border-t border-line pt-5"><Field id="assessment-comment" label="Nhận xét của Coach" required><textarea id="assessment-comment" className={`${textareaClass} min-h-28`} value={comment} onChange={(event) => setComment(event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field id="assessment-score" label="Điểm tổng" hint="0–100"><input id="assessment-score" type="number" min="0" max="100" className={inputClass} value={score} onChange={(event) => setScore(event.target.value)} /></Field><Field id="assessment-next" label="Ngày đánh giá tiếp theo"><input id="assessment-next" type="date" className={inputClass} value={nextAssessmentDate} onChange={(event) => setNextAssessmentDate(event.target.value)} /></Field></div><Field id="assessment-recommendation" label="Khuyến nghị"><textarea id="assessment-recommendation" className={textareaClass} value={recommendation} onChange={(event) => setRecommendation(event.target.value)} /></Field></section>
    </>}
    {error && <InlineAlert>{error}</InlineAlert>}
    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel} disabled={create.isPending}>Hủy</Button><Button type="submit" icon={<CheckCircle />} loading={create.isPending}>Lưu đánh giá</Button></div>
  </form>;
}
