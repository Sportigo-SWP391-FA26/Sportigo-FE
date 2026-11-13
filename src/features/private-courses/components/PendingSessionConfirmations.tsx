import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, SectionHeading } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { InlineAlert } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { attendanceConfirmationApi, formatSessionTime, type PendingSessionConfirmation } from '../attendanceConfirmation';

export function PendingSessionConfirmations() {
  const queryClient = useQueryClient();
  const pending = useQuery({ queryKey: ['private-attendance-pending'], queryFn: attendanceConfirmationApi.pending });
  const [disputing, setDisputing] = useState<PendingSessionConfirmation | null>(null);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['private-attendance-pending'] }),
    queryClient.invalidateQueries({ queryKey: ['private-enrollments'] }),
  ]);
  const confirm = useMutation({
    mutationFn: attendanceConfirmationApi.confirm,
    onSuccess: async () => { toast('Đã xác nhận buổi học.'); await refresh(); },
    onError: () => toast('Không thể xác nhận buổi học này.', 'error'),
  });
  const dispute = useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => attendanceConfirmationApi.dispute(id, reason) });

  if (!pending.data?.length) return null;

  const submitDispute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disputing) return;
    const reason = String(new FormData(event.currentTarget).get('reason')).trim();
    await dispute.mutateAsync({ id: disputing.id, reason });
    toast('Đã gửi khiếu nại. Trung tâm sẽ kiểm tra và phản hồi.');
    setDisputing(null);
    await refresh();
  };

  return (
    <Card className="mb-5 p-5 sm:p-6">
      <SectionHeading title="Buổi 1–1 cần bạn xác nhận" description="Coach đã ghi nhận các buổi dưới đây. Buổi chỉ được trừ khi bạn xác nhận, hoặc tự xác nhận sau 48 giờ." />
      <ul className="divide-y divide-line">
        {pending.data.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-bold text-ink">{item.courseName}</p>
              <p className="text-sm text-muted">{formatSessionTime(item.startsAt, item.endsAt)} · Coach {item.coachName}</p>
              <p className="text-xs text-muted">Tự xác nhận lúc {new Date(item.autoConfirmAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDisputing(item)}>Khiếu nại</Button>
              <Button size="sm" loading={confirm.isPending && confirm.variables === item.id} onClick={() => confirm.mutate(item.id)}>Xác nhận</Button>
            </div>
          </li>
        ))}
      </ul>
      {disputing && (
        <Dialog open size="sm" onClose={() => setDisputing(null)} title="Khiếu nại buổi học" description={`${disputing.courseName} · ${formatSessionTime(disputing.startsAt, disputing.endsAt)}`} footer={<><Button variant="secondary" onClick={() => setDisputing(null)}>Đóng</Button><Button type="submit" form="dispute-form" loading={dispute.isPending}>Gửi khiếu nại</Button></>}>
          <form id="dispute-form" onSubmit={submitDispute}>
            <Field id="dispute-reason" label="Lý do" required><textarea id="dispute-reason" name="reason" className={`${inputClass} min-h-24 py-2.5`} minLength={5} maxLength={500} required placeholder="Ví dụ: tôi không tham gia buổi này" /></Field>
            {dispute.isError && <div className="mt-3"><InlineAlert>Không gửi được khiếu nại. Vui lòng thử lại.</InlineAlert></div>}
          </form>
        </Dialog>
      )}
    </Card>
  );
}
