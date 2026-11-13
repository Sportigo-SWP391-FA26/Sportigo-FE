import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { RegistrationPayment } from '../../member/components/RegistrationPayment';
import { formatDay, membershipApi, money, toCheckInFailure } from '../api';

export function MemberMembershipPage() {
  const queryClient = useQueryClient();
  const mine = useQuery({ queryKey: ['my-membership'], queryFn: membershipApi.mine });
  const plans = useQuery({ queryKey: ['membership-plans'], queryFn: membershipApi.plans });
  const [orderId, setOrderId] = useState<number | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-membership'] });

  const buy = useMutation({
    mutationFn: membershipApi.purchase,
    onSuccess: async (result) => { await refresh(); setOrderId(result.orderId); },
  });

  if (mine.isPending || plans.isPending) return <ListSkeleton rows={3} label="Đang tải gói membership…" />;
  if (mine.isError) return <ErrorState error={mine.error} onRetry={() => mine.refetch()} retrying={mine.isRefetching} />;
  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => plans.refetch()} retrying={plans.isRefetching} />;
  const { current, upcoming, validUntil, pendingOrder } = mine.data;

  return (
    <div>
      <PageHeader eyebrow="Phòng tập" title="Gói membership" description="Tập không giới hạn lượt trong thời hạn gói, không cần Coach." />

      <Card className="mb-5 p-5 sm:p-6">
        <SectionHeading title="Gói của tôi" />
        {current ? (
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="success" dot>Đang hiệu lực</Chip>
            <p className="font-extrabold text-ink">{current.plan.name}</p>
            <p className="text-sm text-muted">{formatDay(current.startDate)} – {formatDay(current.endDate)}</p>
          </div>
        ) : <p className="text-sm text-muted">Bạn chưa có gói nào đang hiệu lực.</p>}
        {upcoming.length > 0 && <p className="mt-3 text-sm text-muted">Có {upcoming.length} gói nối tiếp, được dùng phòng tập đến hết {formatDay(validUntil)}.</p>}
        {pendingOrder && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-energy/10 p-4">
            <p className="text-sm font-semibold text-ink">{pendingOrder.plan.name} đang chờ thanh toán</p>
            <Button size="sm" onClick={() => setOrderId(pendingOrder.id)}>Thanh toán tiếp</Button>
          </div>
        )}
      </Card>

      {plans.data.length === 0 ? <EmptyState title="Chưa có gói mở bán" description="Vui lòng quay lại sau hoặc liên hệ lễ tân." /> : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.data.map((plan) => (
            <Card key={plan.id} className="flex flex-col p-5 sm:p-6">
              <h2 className="text-lg font-extrabold text-ink">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted">{plan.durationMonths} tháng</p>
              <p className="mt-4 text-2xl font-extrabold text-primary-deep">{money(plan.price)}</p>
              {plan.description && <p className="mt-3 text-sm text-muted">{plan.description}</p>}
              <div className="mt-auto pt-5">
                <Button className="w-full" disabled={Boolean(pendingOrder)} loading={buy.isPending && buy.variables === plan.id} onClick={() => buy.mutate(plan.id)}>
                  {current || upcoming.length ? 'Mua nối tiếp' : 'Mua gói'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {buy.isError && <div className="mt-4"><InlineAlert>{toCheckInFailure(buy.error).message}</InlineAlert></div>}

      {orderId !== null && (
        <Dialog open size="lg" onClose={() => { setOrderId(null); void refresh(); }} title="Thanh toán gói membership">
          <RegistrationPayment orderId={orderId} onPaid={() => { setOrderId(null); void refresh(); }} />
        </Dialog>
      )}
    </div>
  );
}
