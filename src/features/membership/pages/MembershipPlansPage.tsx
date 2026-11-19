import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';
import { ImageUploadField } from '../../../components/ui/ImageUploadField';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { membershipApi, money, toCheckInFailure, type ManagedPlan, type PlanStatus } from '../api';

const statusLabel: Record<PlanStatus, string> = { DRAFT: 'Bản nháp', ACTIVE: 'Đang bán', INACTIVE: 'Ngừng bán', ARCHIVED: 'Lưu trữ' };

function PlanDialog({ plan, onClose, onSaved }: { plan: ManagedPlan | null; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [price, setPrice] = useState(plan ? String(Number(plan.price)) : '');
  const [imageUrl, setImageUrl] = useState<string | null>(plan?.imageUrl ?? null);
  const save = useMutation({
    mutationFn: (data: Parameters<typeof membershipApi.createPlan>[0]) => (plan ? membershipApi.updatePlan(plan.id, data) : membershipApi.createPlan(data)),
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try { await save.mutateAsync({
      name: String(values.get('name')).trim(),
      durationMonths: Number(values.get('durationMonths')),
      price: Number(price),
      description: String(values.get('description')).trim() || null,
      imageUrl,
      status: String(values.get('status')) as PlanStatus,
    });
      await onSaved();
      toast(plan ? 'Đã cập nhật gói.' : 'Đã tạo gói.');
      onClose();
    } catch { /* Thông báo lỗi hiển thị trong form. */ }
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
        <div className="sm:col-span-2"><ImageUploadField label="Ảnh minh họa gói tập" value={imageUrl} onChange={setImageUrl} purpose="membership" hint="Ảnh ngang sẽ xuất hiện ở landing và trang hội viên." /></div>
        {save.isError && <div className="sm:col-span-2"><InlineAlert>{toCheckInFailure(save.error).message}</InlineAlert></div>}
      </form>
    </Dialog>
  );
}

export function MembershipPlansPage() {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['managed-membership-plans'], queryFn: membershipApi.managedPlans });
  const [editing, setEditing] = useState<ManagedPlan | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PlanStatus | 'ALL'>('ALL');
  const [statusTarget, setStatusTarget] = useState<ManagedPlan | null>(null);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['managed-membership-plans'] }),
    queryClient.invalidateQueries({ queryKey: ['membership-plans'] }),
  ]);
  const remove = useMutation({
    mutationFn: membershipApi.deletePlan,
    onSuccess: async () => { await refresh(); toast('Đã xóa gói.'); },
    onError: (error) => toast(toCheckInFailure(error).message, 'error'),
  });
  const changeStatus = useMutation({
    mutationFn: (plan: ManagedPlan) => membershipApi.updatePlan(plan.id, { status: plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: async () => { await refresh(); setStatusTarget(null); toast('Đã cập nhật trạng thái gói.'); },
    onError: (error) => toast(toCheckInFailure(error).message, 'error'),
  });
  const allPlans = plans.data ?? [];
  const visiblePlans = allPlans.filter((plan) => (status === 'ALL' || plan.status === status) && plan.name.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')));
  const activeCount = allPlans.filter((plan) => plan.status === 'ACTIVE').length;
  const soldCount = allPlans.reduce((sum, plan) => sum + plan._count.subscriptions, 0);

  return (
    <div>
      <PageHeader eyebrow="Dịch vụ phòng tập" title="Quản lý gói tập" description="Tạo, cập nhật và điều chỉnh các gói membership hiển thị cho hội viên." actions={<Button icon={<Plus weight="bold" aria-hidden="true" />} onClick={() => setEditing('new')}>Tạo gói</Button>} />
      {plans.isPending ? <ListSkeleton rows={3} /> : plans.isError ? <ErrorState error={plans.error} onRetry={() => plans.refetch()} retrying={plans.isRefetching} /> : <>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-5"><p className="text-sm text-muted">Tổng số gói</p><strong className="mt-1 block text-2xl font-extrabold text-ink">{allPlans.length}</strong></Card>
          <Card className="p-5"><p className="text-sm text-muted">Đang mở bán</p><strong className="mt-1 block text-2xl font-extrabold text-primary-deep">{activeCount}</strong></Card>
          <Card className="p-5"><p className="text-sm text-muted">Lượt mua gói</p><strong className="mt-1 block text-2xl font-extrabold text-ink">{soldCount}</strong></Card>
        </div>
        <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Tìm gói tập</span><MagnifyingGlass aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className={`${inputClass} pl-10`} placeholder="Tìm theo tên gói..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label><span className="sr-only">Lọc trạng thái</span><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as PlanStatus | 'ALL')}><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </Card>
        {allPlans.length === 0 ? <EmptyState title="Chưa có gói" description="Tạo gói 1, 3 hoặc 6 tháng để bắt đầu bán." /> : visiblePlans.length === 0 ? <EmptyState title="Không tìm thấy gói" description="Thử tên hoặc trạng thái khác." /> : <Card className="overflow-x-auto">
          <table className="manager-table w-full">
            <thead><tr><th>Tên gói</th><th>Thời hạn</th><th>Giá</th><th>Đã bán</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {visiblePlans.map((plan) => (
                <tr key={plan.id}>
                  <td><div className="flex items-center gap-3">{plan.imageUrl && <img src={plan.imageUrl} alt="" className="h-12 w-20 rounded-lg object-cover" />}<span>{plan.name}</span></div></td>
                  <td>{plan.durationMonths} tháng</td>
                  <td>{money(plan.price)}</td>
                  <td>{plan._count.subscriptions}</td>
                  <td><Chip tone={plan.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{statusLabel[plan.status]}</Chip></td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(plan)}>Sửa</Button>
                      {plan.status !== 'ARCHIVED' && <Button size="sm" variant="secondary" onClick={() => setStatusTarget(plan)}>{plan.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán'}</Button>}
                      {plan.status === 'DRAFT' && plan._count.subscriptions === 0 && <Button size="sm" variant="secondary" loading={remove.isPending && remove.variables === plan.id} onClick={() => remove.mutate(plan.id)}>Xóa</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>}
      </>}
      {editing !== null && <PlanDialog plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {statusTarget && <Dialog open onClose={() => setStatusTarget(null)} title={statusTarget.status === 'ACTIVE' ? 'Ngừng bán gói tập?' : 'Mở bán gói tập?'} description={statusTarget.status === 'ACTIVE' ? `Gói ${statusTarget.name} sẽ ngừng hiển thị để mua mới. Các gói hội viên đã mua vẫn giữ nguyên hiệu lực.` : `Gói ${statusTarget.name} sẽ xuất hiện trên landing và trang hội viên.`} footer={<><Button variant="secondary" onClick={() => setStatusTarget(null)}>Đóng</Button><Button loading={changeStatus.isPending} onClick={() => changeStatus.mutate(statusTarget)}>{statusTarget.status === 'ACTIVE' ? 'Xác nhận ngừng bán' : 'Xác nhận mở bán'}</Button></>}><p className="text-sm text-muted">{statusTarget.name} · {statusTarget.durationMonths} tháng · {money(statusTarget.price)}</p></Dialog>}
    </div>
  );
}
