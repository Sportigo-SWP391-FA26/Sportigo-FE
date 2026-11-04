import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../api';

export function PaymentResultPage() { const [query] = useSearchParams(); const result=useQuery({queryKey:['vnpay-return',query.toString()],queryFn:()=>financeApi.verifyVnpayReturn(query.toString()),retry:1}); const ok = result.data?.valid === true && result.data.confirmed === true; return <main className="payment-result"><div>{ok ? <CheckCircle className="is-ok"/> : <XCircle className="is-error"/>}<span>KẾT QUẢ VNPAY</span><h1>{result.isLoading?'Đang xác minh giao dịch…':ok ? 'Thanh toán thành công' : 'Thanh toán chưa được xác nhận'}</h1><p>{result.isLoading?'Sportigo đang đối chiếu chữ ký và cập nhật đơn hàng.':ok?'Đơn hàng và lịch sử giao dịch đã được cập nhật.':`Trạng thái hệ thống: ${result.data?.paymentStatus ?? 'Không xác định'}.`}</p><p>Mã tham chiếu: {result.data?.reference ?? query.get('vnp_TxnRef') ?? 'Không có'}</p><Link to="/member/payments">Về lịch sử thanh toán</Link></div></main>; }
