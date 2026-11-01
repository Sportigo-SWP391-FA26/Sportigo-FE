import { CheckCircle, Money, Receipt } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { InlineAlert } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { financeApi } from '../api';

export function CashierPage() {
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      await financeApi.cash(Number(id), Number(amount));
      setIsSuccess(true);
      setMessage('Đã ghi nhận thanh toán tiền mặt và phát hành hóa đơn.');
      setId('');
      setAmount('');
    } catch {
      setIsSuccess(false);
      setMessage('Không thể thu tiền. Số tiền phải đúng bằng phần đơn hàng còn thiếu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Giao dịch tại quầy"
        title="Thu tiền mặt"
        description="Đối chiếu mã đơn và ghi nhận đúng số tiền khách hàng cần thanh toán."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5 sm:p-6">
          <SectionHeading title="Thông tin thanh toán" description="Hệ thống sẽ kiểm tra số tiền còn thiếu trước khi xác nhận giao dịch." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cash-order-id" label="Mã đơn hàng" required>
              <input id="cash-order-id" className={inputClass} value={id} onChange={(event) => setId(event.target.value)} inputMode="numeric" placeholder="Ví dụ: 1024" />
            </Field>
            <Field id="cash-amount" label="Số tiền đã nhận" required hint="Nhập số tiền bằng VND, không dùng dấu chấm.">
              <input id="cash-amount" className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder="Ví dụ: 1200000" />
            </Field>
          </div>
          {message && <div className="mt-5"><InlineAlert tone={isSuccess ? 'info' : 'danger'}>{message}</InlineAlert></div>}
          <div className="mt-6 flex justify-end">
            <Button disabled={!id || !amount} loading={submitting} icon={<CheckCircle weight="bold" aria-hidden="true" />} onClick={submit}>
              Xác nhận đã thu tiền
            </Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-primary px-5 py-6 text-white">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/15 text-2xl"><Receipt aria-hidden="true" /></span>
            <h2 className="mt-5 text-xl font-extrabold">Quy trình tại quầy</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">Giao dịch thành công sẽ được lưu cùng người thu và thời điểm xác nhận.</p>
          </div>
          <ol className="space-y-4 p-5 text-sm text-muted">
            {['Xác nhận đúng mã đơn hàng', 'Đếm và đối chiếu số tiền nhận', 'Xác nhận giao dịch và giao hóa đơn'].map((step, index) => (
              <li key={step} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary-deep">{index + 1}</span><span className="pt-1 font-semibold text-ink">{step}</span></li>
            ))}
          </ol>
          <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl bg-accent-energy/10 px-3.5 py-3 text-xs font-semibold text-ink">
            <Money className="size-5 text-accent-energy" aria-hidden="true" /> Không xác nhận nếu số tiền chưa khớp.
          </div>
        </Card>
      </div>
    </div>
  );
}
