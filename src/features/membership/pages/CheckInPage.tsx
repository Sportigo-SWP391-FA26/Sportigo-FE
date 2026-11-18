import { CheckCircle, MagnifyingGlass, ShoppingCart, WarningCircle } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getSessionRole } from '../../../components/auth/session';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { InlineAlert } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { QrScannerPanel } from '../components/QrScannerPanel';
import { CheckInHistoryPanel } from '../components/CheckInHistoryPanel';
import { formatDay, membershipApi, money, toCheckInFailure, type CheckInFailure, type CheckInResult, type MemberIdentity, type PurchaseResult } from '../api';

function MemberBadge({ member }: { member: MemberIdentity }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-lg font-extrabold text-primary-deep">
        {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="size-full object-cover" /> : member.displayName.trim().slice(-1).toUpperCase()}
      </div>
      <div>
        <p className="text-lg font-extrabold text-ink">{member.displayName}</p>
        <p className="font-mono text-sm text-muted">{member.memberCode}</p>
      </div>
    </div>
  );
}

function SellPlans({ member }: { member: MemberIdentity }) {
  const plans = useQuery({ queryKey: ['membership-plans'], queryFn: membershipApi.plans });
  const [order, setOrder] = useState<PurchaseResult | null>(null);
  const sell = useMutation({ mutationFn: (planId: number) => membershipApi.sellToMember(member.id, planId), onSuccess: setOrder });

  if (order) {
    return (
      <div className="mt-4">
        <InlineAlert tone="info">Đã tạo đơn {order.orderNumber}, cần thu {money(order.amount)} trong 15 phút.</InlineAlert>
        <div className="mt-3"><ButtonLink to="/app/cashier" icon={<ShoppingCart aria-hidden="true" />}>Đến trang thu tiền</ButtonLink></div>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-bold text-ink">Bán gói tại quầy</p>
      <div className="flex flex-wrap gap-2">
        {plans.data?.map((plan) => (
          <Button key={plan.id} variant="secondary" size="sm" loading={sell.isPending && sell.variables === plan.id} onClick={() => sell.mutate(plan.id)}>
            {plan.name} · {money(plan.price)}
          </Button>
        ))}
      </div>
      {sell.isError && <div className="mt-3"><InlineAlert>{toCheckInFailure(sell.error).message}</InlineAlert></div>}
    </div>
  );
}

export function CheckInPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [success, setSuccess] = useState<CheckInResult | null>(null);
  const [failure, setFailure] = useState<CheckInFailure | null>(null);

  const checkIn = useMutation({
    mutationFn: ({ memberCode, method }: { memberCode: string; method: 'QR' | 'MANUAL' }) => membershipApi.checkIn(memberCode, method),
    onMutate: () => { setSuccess(null); setFailure(null); },
    onSuccess: (result) => {
      setSuccess(result);
      setCode('');
      void queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
    onError: (error) => setFailure(toCheckInFailure(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const memberCode = code.trim();
    if (memberCode) checkIn.mutate({ memberCode, method: 'MANUAL' });
  };

  return (
    <div>
      <PageHeader eyebrow="Tại quầy" title="Check-in phòng tập" description="Quét mã QR trong hồ sơ hội viên hoặc nhập mã thành viên." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <QrScannerPanel onScan={(memberCode) => checkIn.mutate({ memberCode, method: 'QR' })} />
          <form className="mt-5" onSubmit={submit}>
            <Field id="check-in-code" label="Mã thành viên">
              <div className="flex gap-2">
                <input id="check-in-code" className={`${inputClass} font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ví dụ: SG7K2P9X" autoComplete="off" />
                <Button type="submit" disabled={!code.trim()} loading={checkIn.isPending} icon={<MagnifyingGlass weight="bold" aria-hidden="true" />}>Check-in</Button>
              </div>
            </Field>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6" aria-live="polite">
            <SectionHeading title="Kết quả" />
            {!success && !failure && <p className="text-sm text-muted">Chưa có lượt quét nào.</p>}
            {success && (
              <div>
                <MemberBadge member={success.member} />
                <p className="mt-4 flex items-center gap-2 font-extrabold text-ink">
                  <CheckCircle className="size-6 text-accent-lime" weight="fill" aria-hidden="true" />
                  {success.alreadyCheckedIn ? 'Đã check-in trước đó ít phút' : 'Check-in thành công'}
                </p>
                <p className="mt-1 text-sm text-muted">{success.planName} · hết hạn {formatDay(success.endDate)} · còn {success.daysRemaining} ngày</p>
              </div>
            )}
            {failure && (
              <div>
                {failure.member && <MemberBadge member={failure.member} />}
                <p className="mt-4 flex items-center gap-2 font-extrabold text-danger">
                  <WarningCircle className="size-6" weight="fill" aria-hidden="true" />{failure.message}
                </p>
                {failure.code === 'NO_ACTIVE_MEMBERSHIP' && failure.member && getSessionRole() === 'RECEPTIONIST' && <SellPlans key={failure.member.id} member={failure.member} />}
              </div>
            )}
          </Card>

        </div>
      </div>
      <div className="mt-5"><CheckInHistoryPanel /></div>
    </div>
  );
}
