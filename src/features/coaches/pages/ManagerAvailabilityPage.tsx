import { ArrowsClockwise, CalendarCheck, CheckCircle, Funnel, XCircle } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../../training/errors';
import { useAvailabilityChangeRequests, useAvailabilitySubmissions, useReviewAvailabilityChangeRequest, useReviewAvailabilitySubmission } from '../hooks/useCoachManagement';
import type { AvailabilityChangeRequest, AvailabilitySubmission } from '../types';

const DAYS = [{ value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' }, { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' }, { value: 0, label: 'Chủ nhật' }];
const SHIFTS = [
  { code: 'S1', time: '07:00–08:30' }, { code: 'S2', time: '09:00–10:30' }, { code: 'S3', time: '11:00–12:30' },
  { code: 'S4', time: '13:30–15:00' }, { code: 'S5', time: '15:30–17:00' }, { code: 'S6', time: '17:30–19:00' }, { code: 'S7', time: '19:30–21:00' },
];

function currentReviewMonth() {
  const date = new Date(); date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function ManagerAvailabilityPage() {
  const [month, setMonth] = useState(currentReviewMonth);
  const [status, setStatus] = useState('SUBMITTED');
  const submissions = useAvailabilitySubmissions(month, status || undefined);
  const review = useReviewAvailabilitySubmission(month, status || undefined);
  const changes = useAvailabilityChangeRequests('SUBMITTED');
  const reviewChange = useReviewAvailabilityChangeRequest('SUBMITTED');
  const [selected, setSelected] = useState<AvailabilitySubmission | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectingChange, setRejectingChange] = useState<AvailabilityChangeRequest | null>(null);
  const [reason, setReason] = useState('');
  const selectionKeys = useMemo(() => new Set(selected?.selections.map((item) => `${item.dayOfWeek}:${item.shiftCode}`) ?? []), [selected]);

  const decide = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selected) return;
    try {
      await review.mutateAsync({ id: selected.id, input: { decision, reason: decision === 'REJECT' ? reason : undefined } });
      toast(decision === 'APPROVE' ? 'Đã duyệt toàn bộ lịch availability.' : 'Đã từ chối và gửi lý do cho Coach.');
      setSelected(null); setRejecting(false); setReason('');
    } catch (error) { toast(parseApiError(error).message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="Duyệt lịch Coach" description="Duyệt hoặc từ chối toàn bộ thời khóa biểu availability. Manager không chỉnh trực tiếp lựa chọn của Coach." />
      <Card className="manager-filter-bar mb-5 grid gap-3 p-4 sm:grid-cols-[220px_220px_1fr] sm:items-end">
        <label className="text-sm font-bold text-ink">Tháng<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="text-sm font-bold text-ink">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} mt-2`}><option value="SUBMITTED">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Bị từ chối</option><option value="DRAFT">Bản nháp</option><option value="">Tất cả</option></select></label>
        <div className="flex items-center gap-2 text-sm text-muted sm:justify-end"><Funnel aria-hidden="true" /> Danh sách cập nhật theo bộ lọc</div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5 sm:p-6">
          <SectionHeading title="Lịch theo tháng" description={`${submissions.data?.length ?? 0} lịch phù hợp bộ lọc`} />
          {submissions.isPending ? <ListSkeleton /> : submissions.isError ? <ErrorState error={submissions.error} onRetry={() => submissions.refetch()} /> : submissions.data?.length ? <div className="divide-y divide-line">{submissions.data.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className="flex w-full items-center gap-4 py-4 text-left hover:bg-canvas/70 focus-visible:outline-2 focus-visible:outline-primary sm:px-3"><span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-xl font-extrabold text-primary-deep">{item.coach?.user.avatarUrl ? <img src={item.coach.user.avatarUrl} alt="" className="size-full object-cover" /> : item.coach?.user.displayName.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate font-extrabold text-ink">{item.coach?.user.displayName}</span><span className="mt-1 block text-xs text-muted">Tháng {item.month.slice(0, 7)} · Lần gửi {item.revision} · {item.selections.length} ca</span></span><Chip tone={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'danger' : item.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{item.status === 'SUBMITTED' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Bị từ chối' : 'Bản nháp'}</Chip></button>)}</div> : <EmptyState icon={<CalendarCheck />} title="Không có lịch phù hợp" description="Thử chọn trạng thái hoặc tháng khác." />}
        </Card>

        <Card className="h-fit p-5 sm:p-6">
          <SectionHeading title="Yêu cầu đổi ca" description="Chỉ duyệt khi Coach, Member và phòng cũ không xung đột ở giờ mới." />
          {changes.isPending ? <ListSkeleton rows={2} /> : changes.isError ? <ErrorState error={changes.error} onRetry={() => changes.refetch()} compact /> : changes.data?.length ? <div className="space-y-3">{changes.data.map((item) => <article key={item.id} className="rounded-2xl bg-canvas p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold text-ink">{item.coach?.user.displayName}</p><p className="mt-1 text-xs font-semibold text-primary-deep">{DAYS.find((day) => day.value === item.oldDayOfWeek)?.label} {item.oldShiftCode} → {DAYS.find((day) => day.value === item.newDayOfWeek)?.label} {item.newShiftCode}</p></div><ArrowsClockwise className="text-xl text-primary" /></div><p className="mt-3 text-sm leading-relaxed text-muted">{item.reason}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" variant="secondary" onClick={() => { setReason(''); setRejectingChange(item); }}>Từ chối</Button><Button size="sm" onClick={async () => { try { await reviewChange.mutateAsync({ id: item.id, input: { decision: 'APPROVE' } }); toast('Đã duyệt và cập nhật các buổi đủ điều kiện.'); } catch (error) { toast(parseApiError(error).message, 'error'); } }}>Duyệt đổi ca</Button></div></article>)}</div> : <EmptyState compact icon={<ArrowsClockwise />} title="Không có yêu cầu chờ duyệt" />}
        </Card>
      </div>

      <Dialog open={Boolean(selected)} onClose={() => { setSelected(null); setRejecting(false); }} size="lg" title={selected ? `Lịch của ${selected.coach?.user.displayName}` : 'Chi tiết availability'} description={selected && `Tháng ${selected.month.slice(0, 7)} · ${selected.selections.length} ca trên ${new Set(selected.selections.map((item) => item.dayOfWeek)).size} ngày`} footer={selected?.status === 'SUBMITTED' ? <><Button variant="secondary" onClick={() => setRejecting(true)} icon={<XCircle />}>Từ chối</Button><Button onClick={() => decide('APPROVE')} loading={review.isPending} icon={<CheckCircle />}>Duyệt toàn bộ</Button></> : <Button variant="secondary" onClick={() => setSelected(null)}>Đóng</Button>}>
        {selected && <div className="space-y-5"><div className="overflow-x-auto rounded-2xl border border-line"><table className="w-full min-w-[720px] table-fixed"><thead><tr className="bg-canvas"><th className="w-24 px-3 py-3 text-left text-xs text-muted">Ca</th>{DAYS.map((day) => <th key={day.value} className="px-2 py-3 text-center text-xs font-extrabold text-ink">{day.label}</th>)}</tr></thead><tbody>{SHIFTS.map((shift) => <tr key={shift.code} className="border-t border-line"><th className="px-3 py-3 text-left text-xs"><span className="block font-extrabold text-primary-deep">{shift.code}</span><span className="text-muted">{shift.time}</span></th>{DAYS.map((day) => { const cell = selected.selections.find((item) => item.dayOfWeek === day.value && item.shiftCode === shift.code); return <td key={day.value} className="p-1.5"><div className={`grid min-h-12 place-items-center rounded-xl text-xs font-bold ${cell?.isAssigned ? 'bg-ink text-white' : selectionKeys.has(`${day.value}:${shift.code}`) ? 'bg-primary/12 text-primary-deep' : 'bg-canvas text-muted/60'}`}>{cell?.isAssigned ? 'Đã xếp lớp' : selectionKeys.has(`${day.value}:${shift.code}`) ? 'Có thể dạy' : '—'}</div></td>; })}</tr>)}</tbody></table></div>{selected.rejectionReason && <Card className="bg-danger/5 p-4"><p className="text-sm font-bold text-danger">Lý do từ chối</p><p className="mt-1 text-sm text-ink">{selected.rejectionReason}</p></Card>}</div>}
      </Dialog>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} title="Từ chối lịch availability" description="Coach sẽ nhận lý do và được sửa, gửi lại đến hết ngày 28." footer={<><Button variant="secondary" onClick={() => setRejecting(false)}>Quay lại</Button><Button variant="danger" disabled={reason.trim().length < 5} loading={review.isPending} onClick={() => decide('REJECT')}>Xác nhận từ chối</Button></>}><label className="text-sm font-bold text-ink">Lý do bắt buộc<textarea className={`${inputClass} mt-2 min-h-32 resize-y`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nêu rõ phần Coach cần điều chỉnh…" /></label></Dialog>

      <Dialog open={Boolean(rejectingChange)} onClose={() => { setRejectingChange(null); setReason(''); }} title="Từ chối yêu cầu đổi ca" description={rejectingChange ? `${rejectingChange.coach?.user.displayName}: ${rejectingChange.oldShiftCode} → ${rejectingChange.newShiftCode}` : undefined} footer={<><Button variant="secondary" onClick={() => { setRejectingChange(null); setReason(''); }}>Quay lại</Button><Button variant="danger" disabled={reason.trim().length < 5} loading={reviewChange.isPending} onClick={async () => { if (!rejectingChange) return; try { await reviewChange.mutateAsync({ id: rejectingChange.id, input: { decision: 'REJECT', reason: reason.trim() } }); toast('Đã từ chối yêu cầu đổi ca.'); setRejectingChange(null); setReason(''); } catch (error) { toast(parseApiError(error).message, 'error'); } }}>Xác nhận từ chối</Button></>}><label className="text-sm font-bold text-ink">Lý do bắt buộc<textarea className={`${inputClass} mt-2 min-h-32 resize-y`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nêu rõ xung đột hoặc phần Coach cần điều chỉnh…" /></label></Dialog>
    </div>
  );
}

