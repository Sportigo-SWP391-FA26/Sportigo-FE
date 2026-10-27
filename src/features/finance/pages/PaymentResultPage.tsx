import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../api';

export function PaymentResultPage() { const [query] = useSearchParams(); const result=useQuery({queryKey:['vnpay-return',query.toString()],queryFn:()=>financeApi.verifyVnpayReturn(query.toString())}); const ok = result.data?.valid === true && result.data.responseCode === '00'; return <main className="payment-result"><div>{ok ? <CheckCircle className="is-ok"/> : <XCircle className="is-error"/>}<span>KẾT QUẢ VNPAY</span><h1>{result.isLoading?'Đang xác minh…':ok ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất'}</h1><p>Mã tham chiếu: {result.data?.reference ?? query.get('vnp_TxnRef') ?? 'Không có'}</p><Link to="/member/payments">Về lịch sử thanh toán</Link></div></main>; }
