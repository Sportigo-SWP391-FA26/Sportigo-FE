import { Bank, CheckCircle, Storefront, Tag, Wallet } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { InlineAlert } from '../../../components/ui/States';
import { financeApi, type Promotion } from '../../finance/api';
import { useMyProfile } from '../../profile/hooks/useMyProfile';

const money = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
type Method = 'cash' | 'wallet' | 'vnpay';

export function RegistrationPayment({ orderId, onPaid }: { orderId: number; onPaid?: () => void }) {
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ['service-order', orderId], queryFn: () => financeApi.order(orderId) });
  const promotions = useQuery({ queryKey: ['promotions', 'member'], queryFn: financeApi.promotions });
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: financeApi.wallet });
  const profile = useMyProfile();
  const refetchOrder = order.refetch;
  const [method, setMethod] = useState<Method>('vnpay');
  const [code, setCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const paid = order.data?.payments.filter((item) => ['SUCCESS', 'PARTIALLY_REFUNDED'].includes(item.status)).reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;
  const due = Math.max(0, Number(order.data?.finalAmount ?? 0) - paid);
  const walletAmount = Math.min(Number(wallet.data?.balance ?? 0), due);
  const payable = Boolean(order.data && ['CART', 'PENDING_PAYMENT'].includes(order.data.status) && due > 0 && (!order.data.expiresAt || new Date(order.data.expiresAt).getTime() > openedAt));
  const canApplyCode = payable && paid === 0 && !busy;
  const availableCodes = (promotions.data ?? []).filter((promotion) =>
    (!promotion.applicableType || promotion.applicableType === 'ALL' || order.data?.items.some((item) => item.itemType === promotion.applicableType))
    && Number(order.data?.originalAmount ?? 0) >= Number(promotion.minOrderAmount ?? 0),
  );
  const cashPaid = Boolean(order.data?.payments.some((item) => item.channel === 'COUNTER' && item.status === 'SUCCESS'));
  useEffect(() => {
    if (!cashConfirmed || cashPaid) return;
    const timer = window.setInterval(() => { void refetchOrder(); }, 8000);
    return () => window.clearInterval(timer);
  }, [cashConfirmed, cashPaid, refetchOrder]);
  useEffect(() => {
    if (order.data && due === 0 && ['PAID', 'COMPLETED'].includes(order.data.status)) onPaid?.();
  }, [due, onPaid, order.data]);
  useEffect(() => {
    if (cashPaid) void queryClient.invalidateQueries({ queryKey: ['payments'] });
  }, [cashPaid, queryClient]);

  const apply = async (promotionCode = code) => {
    const normalized = promotionCode.trim().toUpperCase();
    if (!normalized || !canApplyCode) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const updated = await financeApi.applyPromotion(orderId, normalized);
      queryClient.setQueryData(['service-order', orderId], updated);
      await order.refetch();
      setCode(updated.promotion?.code ?? normalized);
      setShowCodes(false);
      setMessage(`Đã áp dụng ${normalized}, giảm ${money(updated.discountAmount)}.`);
    } catch {
      setError('Mã chưa áp dụng được cho đơn này. Hãy kiểm tra điều kiện hoặc chọn mã khác.');
    } finally { setBusy(false); }
  };

  const pay = async () => {
    if (!payable || busy) return;
    setError(''); setMessage('');
    if (method === 'cash') {
      setCashConfirmed(true);
      return;
    }
    setBusy(true);
    try {
      if (method === 'wallet') {
        const result = await financeApi.walletPay(orderId, walletAmount);
        const remaining = Number(result.remainingAmount ?? 0);
        await Promise.all([order.refetch(), wallet.refetch()]);
        await queryClient.invalidateQueries({ queryKey: ['payments'] });
        setMessage(remaining > 0 ? `Đã dùng ${money(walletAmount)} từ ví. Còn ${money(remaining)}; hãy chọn VNPay hoặc thanh toán tại quầy.` : 'Thanh toán thành công. Chỗ học của bạn đã được xác nhận.');
      } else {
        const result = await financeApi.vnpay(orderId);
        window.location.assign(result.paymentUrl);
      }
    } catch {
      setError(method === 'wallet' ? 'Không thể thanh toán bằng ví. Kiểm tra số dư và trạng thái đơn.' : 'Không thể mở VNPay. Vui lòng thử lại.');
    } finally { setBusy(false); }
  };

  return <section className="registration-payment" aria-label="Thanh toán đơn hàng">
    <div className="registration-payment__heading"><h3>{cashConfirmed ? cashPaid ? 'Đã thanh toán tại quầy' : 'Chờ thanh toán tại quầy' : 'Hoàn tất thanh toán'}</h3><p>{cashConfirmed ? cashPaid ? 'Hệ thống đã ghi nhận tiền và xác nhận đăng ký.' : 'Đưa thông tin dưới đây cho lễ tân hoặc Center Manager.' : 'Chọn mã ưu đãi và phương thức phù hợp ngay tại đây.'}</p></div>
    {order.isPending ? <p className="text-sm text-muted">Đang tải số tiền cần thanh toán…</p> : order.isError || !order.data ? <InlineAlert>Không tải được đơn hàng. Bạn có thể mở lại từ Lịch của tôi.</InlineAlert> : <>
      {cashConfirmed ? <div className="registration-payment__cash-receipt" role="status">
        <div className="registration-payment__cash-status"><Storefront aria-hidden="true" /><strong>{cashPaid ? 'Thanh toán thành công' : 'Đang chờ xác nhận đã thu tiền'}</strong></div>
        <dl>
          <div><dt>Mã đơn</dt><dd>{order.data.orderNumber}</dd></div>
          <div><dt>Họ tên hội viên</dt><dd>{profile.data?.displayName ?? 'Đang tải thông tin…'}</dd></div>
          <div><dt>Mã hội viên</dt><dd>{profile.data?.member?.memberCode ?? 'Đang tải thông tin…'}</dd></div>
          <div><dt>{cashPaid ? 'Số tiền đã thu' : 'Số tiền cần thanh toán'}</dt><dd>{money(cashPaid ? paid : due)}</dd></div>
        </dl>
        <p>{cashPaid ? 'Đăng ký lớp đã được cập nhật theo thanh toán thành công.' : 'Lễ tân hoặc Center Manager tra cứu mã đơn, đối chiếu họ tên và mã hội viên, nhận đủ tiền rồi xác nhận trên hệ thống. Việc chọn tiền mặt ở đây chưa ghi nhận thanh toán.'}</p>
        {!cashPaid && <div className="registration-payment__cash-actions"><Button variant="secondary" onClick={() => void order.refetch()} loading={order.isFetching}>Kiểm tra trạng thái</Button><Button variant="secondary" onClick={() => setCashConfirmed(false)}>Đổi phương thức</Button></div>}
      </div> : <>
      <div className="registration-payment__promotion">
        <label htmlFor="registration-promotion"><Tag aria-hidden="true" /> Mã giảm giá</label>
        <div className="registration-payment__code-row"><input id="registration-promotion" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Nhập mã ưu đãi" disabled={!canApplyCode} /><Button size="sm" variant="secondary" onClick={() => void apply()} disabled={!canApplyCode || !code.trim()}>Áp dụng</Button></div>
        <button type="button" className="registration-payment__show-codes" onClick={() => setShowCodes((value) => !value)} aria-expanded={showCodes}>{showCodes ? 'Ẩn mã ưu đãi' : 'Xem mã ưu đãi có thể dùng'}</button>
        {showCodes && <div className="registration-payment__codes">{promotions.isPending ? <p>Đang tải mã ưu đãi…</p> : promotions.isError ? <p>Chưa tải được danh sách mã.</p> : availableCodes.length ? availableCodes.map((promotion: Promotion) => <button type="button" key={promotion.id} onClick={() => { setCode(promotion.code); void apply(promotion.code); }} disabled={!canApplyCode}><strong>{promotion.code}</strong><span>{promotion.name} · {promotion.discountType === 'PERCENTAGE' ? `giảm ${Number(promotion.discountValue)}%` : `giảm ${money(promotion.discountValue)}`}</span></button>) : <p>Hiện chưa có mã phù hợp với đơn này.</p>}</div>}
        {Number(order.data.discountAmount) > 0 && <p className="registration-payment__applied"><CheckCircle weight="fill" aria-hidden="true" /> Đã giảm {money(order.data.discountAmount)} với mã {order.data.promotion?.code}</p>}
      </div>
      <div className="registration-payment__methods" role="radiogroup" aria-label="Phương thức thanh toán">
        {([['cash', Storefront, 'Tiền mặt tại quầy', 'Lễ tân xác nhận khi nhận đủ tiền.'], ['wallet', Wallet, 'Ví Sportigo', `Số dư ${money(wallet.data?.balance ?? 0)} · dùng ${money(walletAmount)}`], ['vnpay', Bank, 'VNPay', 'Chuyển khoản, thẻ hoặc QR.']] as const).map(([value, Icon, title, hint]) => <button key={value} type="button" role="radio" aria-checked={method === value} className={method === value ? 'is-selected' : ''} onClick={() => setMethod(value)} disabled={value === 'wallet' && walletAmount <= 0}><Icon aria-hidden="true" /><span><strong>{title}</strong><small>{hint}</small></span>{method === value && <CheckCircle weight="fill" aria-hidden="true" />}</button>)}
      </div>
      <div className="registration-payment__footer"><span>Còn phải thanh toán <strong>{money(due)}</strong></span><Button onClick={() => void pay()} loading={busy} disabled={!payable || (method === 'wallet' && walletAmount <= 0)}>{method === 'cash' ? 'Xác nhận thanh toán tại quầy' : method === 'wallet' ? 'Thanh toán bằng ví' : 'Tiếp tục với VNPay'}</Button></div>
      {!payable && <p className="text-sm text-muted">{due <= 0 ? 'Đơn đã được thanh toán đầy đủ.' : 'Đơn hiện không thể thanh toán hoặc đã hết hạn.'}</p>}
      {message && <p role="status" className="registration-payment__message">{message}</p>}
      {error && <InlineAlert>{error}</InlineAlert>}
      </>}
    </>}
  </section>;
}
