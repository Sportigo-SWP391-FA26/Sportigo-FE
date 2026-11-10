import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { membershipApi, money, toCheckInFailure, type ManagedPlan, type PlanStatus } from '../api';

const statusLabel: Record<PlanStatus, string> = { DRAFT: 'Bản nháp', ACTIVE: 'Đang bán', INACTIVE: 'Ngừng bán', ARCHIVED: 'Lưu trữ' };

function PlanDialog({ plan, onClose, onSaved }: { plan: ManagedPlan | null; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [price, setPrice] = useState(plan ? String(Number(plan.price)) : '');
  const save = useMutation({
    mutationFn: (data: Parameters<typeof membershipApi.createPlan>[0]) => (plan ? membershipApi.updatePlan(plan.id, data) : membershipApi.createPlan(data)),
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await save.mutateAsync({
      name: String(values.get('name')).trim(),
      durationMonths: Number(values.get('durationMonths')),
      price: Number(price),
      description: String(values.get('description')).trim() || null,
      status: String(values.get('status')) as PlanStatus,
    });
    await onSaved();
    toast(plan ? 'Đã cập nhật gói.' : 'Đã tạo gói.');
    onClose();
  };
  return (
    <Dialog open onClose={onClose} title={plan ? 'Sửa gói membership' : 'Tạo gói membership'} description="Gói cho khách chỉ dùng phòng tập, không giới hạn lượt trong thời hạn." footer={<><Button variant="secondary" onClick={onClose}>Đóng</Button><Button type="submit" form="plan-form" loading={save.isPending}>Lưu</Button></>}>
      <form id="plan-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field id="plan-name" label="Tên gói" required className="sm:col-span-2"><input id="plan-name" name="name" className={inputClass} defaultValue={plan?.name} required minLength={2} /></Field>
        <Field id="plan-duration" label="Thời hạn" required>
          <select id="plan-duration" name="durationMonths" className={inputClass} defaultValue={plan?.durationMonths ?? 1}>
            {[...new Set([1, 3, 6, plan?.durationMonths ?? 1])].sort((a, b) => a - b).map((months) => <option key={months} value={months}>{months} tháng</option>)}
          </select>
        </Field>
        <Field id="plan-price" label="Giá" required><CurrencyInput id="plan-price" className={inputClass} value={price} onValueChange={setPrice} required /></Field>
        <Field id="plan-status" label="Trạng thái" required>
          <select id="plan-status" name="status" className={inputClass} defaultValue={plan?.status ?? 'ACTIVE'}>
            {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id="plan-description" label="Mô tả" className="sm:col-span-2"><textarea id="plan-description" name="description" className={`${inputClass} min-h-20 py-2.5`} defaultValue={plan?.description ?? ''} maxLength={1000} /></Field>
        {save.isError && <div className="sm:col-span-2"><InlineAlert>{toCheckInFailure(save.error).message}</InlineAlert></div>}
      </form>
    </Dialog>
  );
}

export function MembershipPlansPage() {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['managed-membership-plans'], queryFn: membershipApi.managedPlans });
  const [editing, setEditing] = useState<ManagedPlan | 'new' | null>(null);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['managed-membership-plans'] }),
    queryClient.invalidateQueries({ queryKey: ['membership-plans'] }),
  ]);
  const remove = useMutation({
    mutationFn: membershipApi.deletePlan,
    onSuccess: async () => { await refresh(); toast('Đã xóa gói.'); },
    onError: (error) => toast(toCheckInFailure(error).message, 'error'),
  });

  return (
    <div>
      <PageHeader eyebrow="Dịch vụ" title="Gói membership" description="Quản lý các gói phòng tập theo tháng." actions={<Button icon={<Plus weight="bold" aria-hidden="true" />} onClick={() => setEditing('new')}>Tạo gói</Button>} />
      {plans.isPending ? <ListSkeleton rows={3} /> : plans.isError ? <ErrorState error={plans.error} onRetry={() => plans.refetch()} retrying={plans.isRefetching} /> : plans.data.length === 0 ? <EmptyState title="Chưa có gói" description="Tạo gói 1, 3 hoặc 6 tháng để bắt đầu bán." /> : (
        <Card className="overflow-x-auto">
          <table className="manager-table w-full">
            <thead><tr><th>Tên gói</th><th>Thời hạn</th><th>Giá</th><th>Đã bán</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {plans.data.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.durationMonths} tháng</td>
                  <td>{money(plan.price)}</td>
                  <td>{plan._count.subscriptions}</td>
                  <td><Chip tone={plan.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{statusLabel[plan.status]}</Chip></td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(plan)}>Sửa</Button>
                      {plan.status === 'DRAFT' && plan._count.subscriptions === 0 && <Button size="sm" variant="secondary" loading={remove.isPending && remove.variables === plan.id} onClick={() => remove.mutate(plan.id)}>Xóa</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {editing !== null && <PlanDialog plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}
