import { ArrowSquareOut, Bank, CheckCircle, ClockCounterClockwise, CreditCard, Plus, Storefront, Tag, Wallet } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { financeApi, saveBlob } from '../api';
import { useMyProfile } from '../../profile/hooks/useMyProfile';

const money = (value: number | string) => Number(value).toLocaleString('vi-VN') + ' ₫';

export function MemberPaymentsPage() {
  const [searchParams] = useSearchParams();
  const selectedOrderId = Number(searchParams.get('orderId')) || 0;
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: financeApi.wallet });
  const profile = useMyProfile();
  const payments = useQuery({ queryKey: ['payments'], queryFn: financeApi.payments });
  const order = useQuery({ queryKey: ['service-order', selectedOrderId], queryFn: () => financeApi.order(selectedOrderId), enabled: selectedOrderId > 0 });
  const [method, setMethod] = useState<'cash' | 'wallet' | 'vnpay'>('vnpay');
  const [message, setMessage] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [applyingPromotion, setApplyingPromotion] = useState(false);
  const paidAmount = useMemo(() => order.data?.payments.filter((item) => ['SUCCESS', 'PARTIALLY_REFUNDED'].includes(item.status)).reduce((sum, item) => sum + Number(item.amount), 0) ?? 0, [order.data]);
  const remainingAmount = Math.max(0, Number(order.data?.finalAmount ?? 0) - paidAmount);
  const walletAmount = Math.min(Number(wallet.data?.balance ?? 0), remainingAmount);
  const isExpired = Boolean(order.data?.expiresAt && new Date(order.data.expiresAt) <= new Date());
  const isPayable = Boolean(order.data && ['CART', 'PENDING_PAYMENT'].includes(order.data.status) && remainingAmount > 0 && !isExpired);

  const selectMethod = (value: typeof method) => { setMethod(value); setMessage(''); };

  const applyPromotion = async () => {
    const code = promotionCode.trim().toUpperCase();
    if (!code) return setMessage('Vui lòng nhập mã giảm giá.');
    setApplyingPromotion(true);
    setMessage('');
    try {
      const updated = await financeApi.applyPromotion(selectedOrderId, code);
      setPromotionCode(updated.promotion?.code ?? code);
      await order.refetch();
      setMessage(`Đã áp dụng mã ${updated.promotion?.code ?? code}. Bạn được giảm ${money(updated.discountAmount)}.`);
    } catch {
      setMessage('Mã giảm giá không hợp lệ, đã hết hạn hoặc không áp dụng cho đơn này.');
    } finally {
      setApplyingPromotion(false);
    }
  };

  const startVnpay = async () => {
    try {
      const result = await financeApi.vnpay(selectedOrderId);
      window.location.assign(result.paymentUrl);
    } catch { setMessage('Không thể tạo giao dịch VNPay. Vui lòng thử lại hoặc chọn phương thức khác.'); }
  };
  const payWallet = async () => {
    if (walletAmount <= 0) return setMessage('Số dư ví không đủ để thực hiện thanh toán.');
    try {
      const result = await financeApi.walletPay(selectedOrderId, walletAmount);
      const left = Number(result.remainingAmount ?? 0);
      setMessage(left > 0 ? `Đã dùng ${money(walletAmount)} từ ví. Bạn còn ${money(left)} cần thanh toán qua VNPay hoặc tại quầy.` : 'Thanh toán thành công. Dịch vụ của bạn đã được kích hoạt.');
      await Promise.all([wallet.refetch(), payments.refetch(), order.refetch()]);
    } catch { setMessage('Không thể thanh toán bằng ví. Vui lòng kiểm tra số dư và trạng thái đơn hàng.'); }
  };
  const submitPayment = () => {
    if (method === 'cash') return setMessage(`Vui lòng cung cấp mã ${order.data?.orderNumber} cho lễ tân. Đơn chỉ được xác nhận sau khi lễ tân thu đủ tiền.`);
    if (method === 'wallet') return void payWallet();
    return void startVnpay();
  };

  return <div className="finance-page">
    <header className="finance-page__hero"><div><span>TÀI CHÍNH CÁ NHÂN</span><h1>Thanh toán & ví Sportigo</h1><p>Theo dõi số dư, kết hợp ví với VNPay và tải hóa đơn của bạn.</p></div><div className="wallet-balance"><Wallet size={28}/><span>Số dư khả dụng</span><b>{money(wallet.data?.balance ?? 0)}</b><small>Không rút hoặc chuyển nhượng</small><button type="button" onClick={() => document.getElementById('wallet-top-up')?.scrollIntoView({ behavior: 'smooth' })}><Plus /> Nạp tiền</button></div></header>
    <WalletTopUp onMessage={setMessage} />
    {selectedOrderId > 0 && <section className="payment-checkout" aria-labelledby="checkout-title">
      <header><div><span>THANH TOÁN AN TOÀN</span><h2 id="checkout-title">Chọn phương thức thanh toán</h2><p>Bạn chỉ cần chọn một phương thức. Sportigo không ghi nhận tiền mặt cho đến khi lễ tân thực sự thu tiền.</p></div><CreditCard size={30}/></header>
      {order.isLoading ? <div className="checkout-loading">Đang tải thông tin đơn hàng…</div> : order.isError || !order.data ? <div className="checkout-error">Không thể tải đơn hàng. Vui lòng quay lại lịch của bạn và thử lại.</div> : <>
        <div className="order-summary">
          <div><span>Mã đơn hàng</span><b>{order.data.orderNumber}</b></div>
          <div className="order-summary__service"><span>Dịch vụ</span><b>{order.data.items.map((item) => item.itemNameSnapshot).join(', ')}</b></div>
          <div><span>Cần thanh toán</span><strong>{money(remainingAmount)}</strong></div>
          {order.data.expiresAt && <small>Giữ chỗ đến {new Date(order.data.expiresAt).toLocaleString('vi-VN')}</small>}
        </div>
        <div className="promotion-entry">
          <div className="promotion-entry__icon"><Tag weight="bold" /></div>
          <div className="promotion-entry__copy"><b>Mã giảm giá</b><span>Nhập mã ưu đãi trước khi chọn phương thức thanh toán.</span></div>
          <div className="promotion-entry__control"><input aria-label="Mã giảm giá" value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') void applyPromotion(); }} placeholder="VD: SPORTIGO50" disabled={!isPayable || paidAmount > 0 || applyingPromotion} /><button type="button" onClick={applyPromotion} disabled={!isPayable || !promotionCode.trim() || paidAmount > 0 || applyingPromotion}>{applyingPromotion ? 'Đang kiểm tra…' : order.data.promotion ? 'Áp dụng lại' : 'Áp dụng'}</button></div>
          {Number(order.data.discountAmount) > 0 && <div className="promotion-entry__applied"><CheckCircle weight="fill" /><span><b>{order.data.promotion?.code}</b> đã giảm {money(order.data.discountAmount)}</span></div>}
        </div>
        <div className="payment-methods" role="radiogroup" aria-label="Phương thức thanh toán">
          <button type="button" role="radio" aria-checked={method === 'cash'} className={method === 'cash' ? 'is-selected' : ''} onClick={() => selectMethod('cash')}>
            <span className="payment-method__icon is-orange"><Storefront size={25}/></span><span><b>Tiền mặt tại quầy lễ tân</b><small>Đưa mã đơn, tên {profile.data?.displayName ?? 'hội viên'} hoặc mã {profile.data?.member?.memberCode ?? 'hội viên'} cho lễ tân.</small></span>{method === 'cash' && <CheckCircle weight="fill"/>}
          </button>
          <button type="button" role="radio" aria-checked={method === 'wallet'} className={method === 'wallet' ? 'is-selected' : ''} onClick={() => selectMethod('wallet')} disabled={walletAmount <= 0}>
            <span className="payment-method__icon is-green"><Wallet size={25}/></span><span><b>Số dư ví Sportigo</b><small>Khả dụng {money(wallet.data?.balance ?? 0)} · sẽ dùng {money(walletAmount)}</small></span>{method === 'wallet' && <CheckCircle weight="fill"/>}
          </button>
          <button type="button" role="radio" aria-checked={method === 'vnpay'} className={method === 'vnpay' ? 'is-selected' : ''} onClick={() => selectMethod('vnpay')}>
            <span className="payment-method__icon is-blue"><Bank size={25}/></span><span><b>Chuyển khoản / thẻ qua VNPay</b><small>Thanh toán trực tuyến bằng ngân hàng, thẻ nội địa hoặc mã QR.</small></span>{method === 'vnpay' && <CheckCircle weight="fill"/>}
          </button>
        </div>
        <div className="checkout-footer"><div><span>Tổng cần thanh toán</span>{Number(order.data.discountAmount) > 0 && <small><s>{money(order.data.originalAmount)}</s> · đã giảm {money(order.data.discountAmount)}</small>}<strong>{money(remainingAmount)}</strong></div><button type="button" onClick={submitPayment} disabled={!isPayable}>{method === 'cash' ? 'Xem hướng dẫn tại quầy' : method === 'wallet' ? `Dùng ${money(walletAmount)} từ ví` : <>Tiếp tục với VNPay <ArrowSquareOut/></>}</button></div>
        {!isPayable && <p className="checkout-state">{isExpired ? 'Đơn hàng đã hết hạn thanh toán.' : remainingAmount <= 0 ? 'Đơn hàng đã được thanh toán đầy đủ.' : 'Đơn hàng hiện không thể thanh toán.'}</p>}
        {message && <p className="finance-message" role="status">{message}</p>}
      </>}
    </section>}
    <section className="finance-list"><header><div><h2>Lịch sử giao dịch</h2><p>Các khoản thanh toán tại quầy, VNPay và ví.</p></div><ClockCounterClockwise size={25}/></header>{payments.isLoading ? <p>Đang tải…</p> : payments.data?.length ? payments.data.map((payment) => <article key={payment.id}><div><b>{payment.order.orderNumber}</b><span>{payment.paymentMethod.name} · {payment.reference}</span></div><strong>{money(payment.amount)}</strong><span className={`finance-status is-${payment.status.toLowerCase()}`}>{payment.status}</span><div className="finance-row-actions">{payment.order.invoice && <button className="is-download" onClick={async()=>saveBlob(await financeApi.invoicePdf(payment.order.invoice!.id),`${payment.order.invoice!.invoiceNumber}.pdf`)}>Tải hóa đơn</button>}{['SUCCESS','PARTIALLY_REFUNDED'].includes(payment.status)&&<button onClick={async()=>{const requested=window.prompt('Số tiền yêu cầu hoàn',payment.amount);const reason=window.prompt('Lý do hoàn tiền');if(!requested||!reason)return;try{await financeApi.refund(payment.id,Number(requested),reason);setMessage('Đã gửi yêu cầu hoàn tiền.');}catch{setMessage('Chỉ có thể yêu cầu hoàn sau khi dịch vụ đã hủy hợp lệ.');}}}>Yêu cầu hoàn</button>}</div></article>) : <p>Chưa có giao dịch.</p>}</section>
  </div>;
}

function WalletTopUp({ onMessage }: { onMessage: (message: string) => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const presets = [100000, 200000, 500000, 1000000];
  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 10000) return onMessage('Số tiền nạp tối thiểu là 10.000 ₫.');
    setLoading(true);
    try { const result = await financeApi.topUp(value); window.location.assign(result.paymentUrl); }
    catch { onMessage('Không thể tạo giao dịch nạp ví. Vui lòng thử lại.'); setLoading(false); }
  };
  return <section className="wallet-top-up" id="wallet-top-up"><div><span>NẠP TIỀN QUA VNPAY</span><h2>Nạp tiền vào ví</h2><p>Tiền chỉ được cộng vào ví sau khi VNPay xác nhận giao dịch thành công.</p></div><div className="wallet-top-up__form"><div className="wallet-top-up__presets">{presets.map((value) => <button type="button" key={value} onClick={() => setAmount(String(value))}>{money(value)}</button>)}</div><label>Số tiền muốn nạp<input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="Tối thiểu 10.000 ₫" /></label><button type="button" onClick={submit} disabled={loading || !amount}>{loading ? 'Đang chuyển đến VNPay…' : 'Nạp tiền qua VNPay'} <ArrowSquareOut /></button></div></section>;
}
