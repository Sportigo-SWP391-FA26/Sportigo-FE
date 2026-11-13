import { ArrowSquareOut, ClockCounterClockwise, CreditCard, Plus, Wallet } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { financeApi } from '../api';
import { RegistrationPayment } from '../../member/components/RegistrationPayment';
import { useMyClassRegistrations } from '../../member/bookingHooks';
import { useMyPrivateEnrollments } from '../../private-courses/hooks/usePrivateCourses';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';

const money = (value: number | string) => Number(value).toLocaleString('vi-VN') + ' ₫';

export function MemberPaymentsPage() {
  const [searchParams] = useSearchParams();
  const selectedOrderId = Number(searchParams.get('orderId')) || 0;
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: financeApi.wallet });
  const classRegistrations = useMyClassRegistrations();
  const privateEnrollments = useMyPrivateEnrollments();
  const payments = useQuery({ queryKey: ['payments'], queryFn: financeApi.payments });
  const order = useQuery({ queryKey: ['service-order', selectedOrderId], queryFn: () => financeApi.order(selectedOrderId), enabled: selectedOrderId > 0, refetchInterval: (query) => query.state.data?.status === 'PENDING_PAYMENT' ? 15_000 : false });
  const [message, setMessage] = useState('');
  const paidAmount = order.data?.payments.filter((item) => ['SUCCESS', 'PARTIALLY_REFUNDED'].includes(item.status)).reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;
  const remainingAmount = Math.max(0, Number(order.data?.finalAmount ?? 0) - paidAmount);
  const pendingClasses = (classRegistrations.data ?? []).filter((registration) => registration.status === 'PENDING_PAYMENT' && registration.order);
  const pendingPrivate = (privateEnrollments.data ?? []).filter((enrollment) => enrollment.status === 'PENDING_PAYMENT');

  return <div className="finance-page">
    <header className="finance-page__hero"><div><span>TÀI CHÍNH CÁ NHÂN</span><h1>Thanh toán & ví Sportigo</h1><p>Theo dõi số dư, lịch sử giao dịch và thanh toán bằng ví hoặc VNPay.</p></div><div className="wallet-balance"><Wallet size={28}/><span>Số dư khả dụng</span><b>{money(wallet.data?.balance ?? 0)}</b><small>Không rút hoặc chuyển nhượng</small><button type="button" onClick={() => document.getElementById('wallet-top-up')?.scrollIntoView({ behavior: 'smooth' })}><Plus /> Nạp tiền</button></div></header>
    <WalletTopUp onMessage={setMessage} />
    {message && <p className="finance-message" role="status">{message}</p>}
    {(pendingClasses.length > 0 || pendingPrivate.length > 0) && <section className="finance-pending" aria-labelledby="finance-pending-title">
      <div><h2 id="finance-pending-title">Giao dịch chưa hoàn thành</h2><p>Đăng ký chỉ được xác nhận khi hệ thống ghi nhận đủ tiền. Nếu thanh toán tại quầy, hãy đưa mã đơn, họ tên hoặc mã hội viên cho lễ tân hoặc Center Manager.</p></div>
      <div className="finance-pending__list">
        {pendingClasses.map((registration) => <article key={registration.id}>
          <div><strong>{registration.groupClass.name}</strong><span>{registration.order?.orderNumber} · Chờ thanh toán</span></div>
          <b>{money(registration.order?.finalAmount ?? registration.price)}</b>
          {registration.order && <Link to={`/member/payments?orderId=${registration.order.id}`}>Xem đơn</Link>}
        </article>)}
        {pendingPrivate.map((enrollment) => <article key={`private-${enrollment.id}`}><div><strong>{enrollment.privateCourse.name}</strong><span>Khóa 1–1 #{enrollment.id} · Chờ thanh toán</span></div><b>{money(enrollment.purchasedPrice)}</b><Link to="/member/my-schedule">Xem lịch</Link></article>)}
      </div>
    </section>}
    {selectedOrderId > 0 && <section className="payment-checkout" aria-labelledby="checkout-title">
      <header><div><span>THANH TOÁN AN TOÀN</span><h2 id="checkout-title">Thanh toán đơn hàng</h2><p>Chọn mã ưu đãi và phương thức thanh toán phù hợp. Tiền mặt chỉ được ghi nhận khi nhân viên xác nhận đã thu đủ.</p></div><CreditCard size={30}/></header>
      {order.isLoading ? <div className="checkout-loading">Đang tải thông tin đơn hàng…</div> : order.isError || !order.data ? <div className="checkout-error">Không thể tải đơn hàng. Vui lòng quay lại lịch của bạn và thử lại.</div> : <>
        <div className="order-summary">
          <div><span>Mã đơn hàng</span><b>{order.data.orderNumber}</b></div>
          <div className="order-summary__service"><span>Dịch vụ</span><b>{order.data.items.map((item) => item.itemNameSnapshot).join(', ')}</b></div>
          <div><span>Còn phải thanh toán</span><strong>{money(remainingAmount)}</strong></div>
          {order.data.expiresAt && <small>Giữ chỗ đến {new Date(order.data.expiresAt).toLocaleString('vi-VN')}</small>}
        </div>
        <RegistrationPayment key={selectedOrderId} orderId={selectedOrderId} />
      </>}
    </section>}
    <section className="finance-list"><header><div><h2>Lịch sử giao dịch</h2><p>Các khoản thanh toán tại quầy, VNPay và ví. Hủy lớp và hoàn tiền được xử lý trong “Lịch của tôi”.</p></div><ClockCounterClockwise size={25}/></header>{payments.isLoading ? <p>Đang tải…</p> : payments.data?.length ? payments.data.map((payment) => <article key={payment.id}><div><b>{payment.order.orderNumber}</b><span>{payment.order.items.map((item) => item.itemNameSnapshot).join(', ') || 'Giao dịch ví'} · {payment.paymentMethod.name} · {payment.reference}</span></div><strong>{money(payment.amount)}</strong><span className={`finance-status is-${payment.status.toLowerCase()}`}>{payment.status}</span></article>) : <p>Chưa có giao dịch.</p>}</section>
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
  return <section className="wallet-top-up" id="wallet-top-up"><div><span>NẠP TIỀN QUA VNPAY</span><h2>Nạp tiền vào ví</h2><p>Tiền chỉ được cộng vào ví sau khi VNPay xác nhận giao dịch thành công.</p></div><div className="wallet-top-up__form"><div className="wallet-top-up__presets">{presets.map((value) => <button type="button" key={value} onClick={() => setAmount(String(value))}>{money(value)}</button>)}</div><label>Số tiền muốn nạp<CurrencyInput value={amount} onValueChange={setAmount} placeholder="Tối thiểu 10.000 ₫" /></label><button type="button" onClick={submit} disabled={loading || !amount}>{loading ? 'Đang chuyển đến VNPay…' : 'Nạp tiền qua VNPay'} <ArrowSquareOut /></button></div></section>;
}
