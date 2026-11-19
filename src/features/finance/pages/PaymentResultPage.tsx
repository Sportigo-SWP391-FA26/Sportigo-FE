import {
  ArrowClockwise,
  CheckCircle,
  ClockCountdown,
  Receipt,
  XCircle,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { financeApi } from '../api';

const SUCCESS_CODE = '00';

function readableFailure(code?: string) {
  if (code === '24') return 'Bạn đã hủy giao dịch trên VNPay.';
  if (code === '51') return 'Tài khoản không đủ số dư để thực hiện giao dịch.';
  if (code === '65') return 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.';
  if (code === '75') return 'Ngân hàng đang bảo trì dịch vụ thanh toán.';
  return 'Giao dịch chưa được VNPay chấp nhận. Không có khoản tiền nào được ghi nhận.';
}

export function PaymentResultPage() {
  const [query] = useSearchParams();
  const queryString = query.toString();
  const gatewayResponse = query.get('vnp_ResponseCode') ?? undefined;
  const gatewayTransaction = query.get('vnp_TransactionStatus') ?? undefined;
  const referenceFromUrl = query.get('vnp_TxnRef') ?? undefined;

  const result = useQuery({
    queryKey: ['vnpay-return', queryString],
    queryFn: () => financeApi.verifyVnpayReturn(queryString),
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 4_000),
    refetchInterval: (current) => {
      const data = current.state.data;
      const gatewayAccepted = (data?.responseCode ?? gatewayResponse) === SUCCESS_CODE
        && (data?.transactionStatus ?? gatewayTransaction) === SUCCESS_CODE;
      const stillSyncing = !data?.confirmed && ['PENDING', 'NOT_FOUND', undefined].includes(data?.paymentStatus);
      return gatewayAccepted && stillSyncing && current.state.dataUpdateCount < 15 ? 1_500 : false;
    },
    refetchIntervalInBackground: true,
  });

  const data = result.data;
  const reference = data?.reference ?? referenceFromUrl ?? 'Không có';
  const gatewayAccepted = (data?.responseCode ?? gatewayResponse) === SUCCESS_CODE
    && (data?.transactionStatus ?? gatewayTransaction) === SUCCESS_CODE;
  const succeeded = data?.valid === true && data.confirmed === true;
  const canStillSynchronize = !data || ['PENDING', 'NOT_FOUND'].includes(data.paymentStatus);
  const explicitlyFailed = data?.valid === false
    || (data && !gatewayAccepted)
    || (data && !data.confirmed && !canStillSynchronize)
    || (!data && !result.isPending && !gatewayAccepted);
  const processing = !succeeded && !explicitlyFailed;

  return (
    <main className={`payment-result payment-result--${succeeded ? 'success' : processing ? 'processing' : 'failed'}`}>
      <section className="payment-result__card" aria-live="polite">
        <div className="payment-result__visual" aria-hidden="true">
          {succeeded ? <CheckCircle weight="fill" /> : processing ? <ClockCountdown weight="duotone" /> : <XCircle weight="fill" />}
        </div>
        <span className="payment-result__eyebrow">KẾT QUẢ THANH TOÁN VNPAY</span>
        <h1>{succeeded ? 'Thanh toán thành công' : processing ? 'Đang xác nhận thanh toán' : 'Thanh toán không thành công'}</h1>
        <p className="payment-result__lead">
          {succeeded
            ? 'Khoản thanh toán đã được ghi nhận. Đơn hàng và lịch học của bạn đã được cập nhật.'
            : processing
              ? 'VNPay đã tiếp nhận giao dịch. Sportigo đang đồng bộ kết quả với ngân hàng, vui lòng không đóng trang.'
              : readableFailure(data?.responseCode ?? gatewayResponse)}
        </p>
        <div className="payment-result__reference">
          <Receipt weight="duotone" aria-hidden="true" />
          <div><span>Mã tham chiếu</span><strong>{reference}</strong></div>
        </div>
        {processing && <div className="payment-result__sync"><i aria-hidden="true" /><span>Đang đối soát tự động với hệ thống…</span></div>}
        <div className="payment-result__actions">
          {explicitlyFailed && (
            <button type="button" onClick={() => void result.refetch()} disabled={result.isFetching}>
              <ArrowClockwise weight="bold" aria-hidden="true" />
              {result.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
            </button>
          )}
          <Link to="/member/payments">{succeeded ? 'Xem lịch sử thanh toán' : 'Về Thanh toán & ví'}</Link>
        </div>
        <small>{processing ? 'Quá trình này thường chỉ mất vài giây.' : succeeded ? 'Cảm ơn bạn đã lựa chọn Sportigo.' : 'Nếu tài khoản đã bị trừ tiền, vui lòng kiểm tra lại sau ít phút hoặc liên hệ lễ tân.'}</small>
      </section>
    </main>
  );
}
