import { ArrowSquareOut, ClockCounterClockwise, Wallet } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { financeApi } from '../api';

const money = (value: number | string) => Number(value).toLocaleString('vi-VN') + ' ₫';

export function MemberPaymentsPage() {
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: financeApi.wallet });
  const payments = useQuery({ queryKey: ['payments'], queryFn: financeApi.payments });
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const startVnpay = async () => { try { const result = await financeApi.vnpay(Number(orderId)); window.location.assign(result.paymentUrl); } catch { setMessage('Không thể tạo giao dịch VNPay. Hãy kiểm tra mã đơn hàng.'); } };
  const payWallet = async () => { try { const result = await financeApi.walletPay(Number(orderId), Number(amount)); setMessage(`Đã thanh toán bằng ví. Còn lại ${money(result.remainingAmount)}.`); await Promise.all([wallet.refetch(), payments.refetch()]); } catch { setMessage('Không thể thanh toán bằng ví. Kiểm tra số dư và đơn hàng.'); } };

  return <div className="finance-page">
    <header className="finance-page__hero"><div><span>TÀI CHÍNH CÁ NHÂN</span><h1>Thanh toán & ví Sportigo</h1><p>Theo dõi số dư, kết hợp ví với VNPay và tải hóa đơn của bạn.</p></div><div className="wallet-balance"><Wallet size={28}/><span>Số dư khả dụng</span><b>{money(wallet.data?.balance ?? 0)}</b><small>Không rút hoặc chuyển nhượng</small></div></header>
    <section className="finance-checkout"><div><h2>Thanh toán đơn hàng</h2><p>Nhập mã đơn được tạo khi đăng ký lớp hoặc khóa 1–1.</p></div><label>Mã đơn hàng<input inputMode="numeric" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Ví dụ: 1024" /></label><label>Số tiền dùng từ ví<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></label><div className="finance-actions"><button onClick={payWallet} disabled={!orderId || !amount}>Dùng số dư ví</button><button className="is-secondary" onClick={startVnpay} disabled={!orderId}>Thanh toán VNPay <ArrowSquareOut/></button></div>{message && <p className="finance-message">{message}</p>}</section>
    <section className="finance-list"><header><div><h2>Lịch sử giao dịch</h2><p>Các khoản thanh toán tại quầy, VNPay và ví.</p></div><ClockCounterClockwise size={25}/></header>{payments.isLoading ? <p>Đang tải…</p> : payments.data?.length ? payments.data.map((payment) => <article key={payment.id}><div><b>{payment.order.orderNumber}</b><span>{payment.paymentMethod.name} · {payment.reference}</span></div><strong>{money(payment.amount)}</strong><span className={`finance-status is-${payment.status.toLowerCase()}`}>{payment.status}</span><div className="finance-row-actions">{payment.order.invoice && <a href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/invoices/${payment.order.invoice.id}/pdf`} target="_blank" rel="noreferrer">Tải hóa đơn</a>}{['SUCCESS','PARTIALLY_REFUNDED'].includes(payment.status)&&<button onClick={async()=>{const requested=window.prompt('Số tiền yêu cầu hoàn',payment.amount);const reason=window.prompt('Lý do hoàn tiền');if(!requested||!reason)return;try{await financeApi.refund(payment.id,Number(requested),reason);setMessage('Đã gửi yêu cầu hoàn tiền.');}catch{setMessage('Chỉ có thể yêu cầu hoàn sau khi dịch vụ đã hủy hợp lệ.');}}}>Yêu cầu hoàn</button>}</div></article>) : <p>Chưa có giao dịch.</p>}</section>
  </div>;
}
