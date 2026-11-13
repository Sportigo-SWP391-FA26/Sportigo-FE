import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { attendanceConfirmationApi, formatSessionTime, type SessionDispute } from '../attendanceConfirmation';

type Decision = 'CONFIRM' | 'REJECT';

export function SessionDisputesPage() {
  const disputes = useQuery({ queryKey: ['private-attendance-disputes'], queryFn: attendanceConfirmationApi.disputes });
  const [target, setTarget] = useState<{ item: SessionDispute; decision: Decision } | null>(null);
  const resolve = useMutation({ mutationFn: ({ id, decision, note }: { id: number; decision: Decision; note: string }) => attendanceConfirmationApi.resolve(id, decision, note) });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    const note = String(new FormData(event.currentTarget).get('note')).trim();
    await resolve.mutateAsync({ id: target.item.id, decision: target.decision, note });
    toast(target.decision === 'CONFIRM' ? 'Đã tính buổi học cho hội viên.' : 'Đã không tính buổi học này.');
    setTarget(null);
    await disputes.refetch();
  };

  return (
    <div>
      <PageHeader eyebrow="Khóa học 1–1" title="Khiếu nại buổi học" description="Hội viên không xác nhận buổi Coach đã ghi nhận. Buổi chỉ bị trừ khi bạn xác nhận đã diễn ra." />
      {disputes.isPending ? <ListSkeleton rows={3} /> : disputes.isError ? <ErrorState error={disputes.error} onRetry={() => disputes.refetch()} retrying={disputes.isRefetching} /> : disputes.data.length === 0 ? <EmptyState title="Không có khiếu nại" description="Các khiếu nại mới của hội viên sẽ xuất hiện tại đây." /> : (
        <Card className="overflow-x-auto">
          <table className="manager-table w-full min-w-[860px]">
            <thead><tr><th>Hội viên</th><th>Khóa học</th><th>Buổi</th><th>Coach</th><th>Lý do</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {disputes.data.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.memberName}</strong><small>{item.memberCode}</small></td>
                  <td>{item.courseName}</td>
                  <td>{formatSessionTime(item.startsAt, item.endsAt)}</td>
                  <td>{item.coachName}</td>
                  <td className="max-w-[260px] text-muted">{item.disputeReason}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setTarget({ item, decision: 'REJECT' })}>Không tính</Button>
                      <Button size="sm" onClick={() => setTarget({ item, decision: 'CONFIRM' })}>Tính buổi</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {target && (
        <Dialog open size="sm" onClose={() => setTarget(null)} title={target.decision === 'CONFIRM' ? 'Xác nhận buổi đã diễn ra' : 'Không tính buổi học'} description={`${target.item.memberName} · ${formatSessionTime(target.item.startsAt, target.item.endsAt)}`} footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Đóng</Button><Button type="submit" form="resolve-form" loading={resolve.isPending}>Lưu quyết định</Button></>}>
          <form id="resolve-form" onSubmit={submit}>
            <Field id="resolve-note" label="Ghi chú gửi hội viên và Coach" required><textarea id="resolve-note" name="note" className={`${inputClass} min-h-24 py-2.5`} minLength={5} maxLength={500} required /></Field>
            {resolve.isError && <div className="mt-3"><InlineAlert>Không lưu được quyết định. Vui lòng thử lại.</InlineAlert></div>}
          </form>
        </Dialog>
      )}
    </div>
  );
}
