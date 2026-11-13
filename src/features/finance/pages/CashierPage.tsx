import { CheckCircle, MagnifyingGlass, Money, Receipt } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';
import { InlineAlert } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { financeApi, type CashOrderResult } from '../api';

export function CashierPage() {
  const [id, setId] = useState('');
  const [selectedOrderNumber, setSelectedOrderNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CashOrderResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setMessage('');
    try {
      setResults(await financeApi.searchCashOrders(query.trim()));
    } catch {
      setIsSuccess(false);
      setMessage('Không thể tra cứu đơn hàng lúc này.');
    } finally {
      setSearching(false);
    }
  };

  const selectOrder = (order: CashOrderResult) => {
    setId(String(order.id));
    setSelectedOrderNumber(order.orderNumber);
    setAmount(String(order.remainingAmount));
  };

  const submit = async () => {
    if (!Number.isInteger(Number(id))) {
      setIsSuccess(false);
      setMessage('Hãy tra cứu rồi chọn giao dịch trong danh sách, hoặc nhập mã giao dịch dạng số.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await financeApi.cash(Number(id), Number(amount));
      setIsSuccess(true);
      setMessage('Đã ghi nhận thanh toán tiền mặt và phát hành hóa đơn.');
      setId('');
      setSelectedOrderNumber('');
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
        description="Đối chiếu mã giao dịch và ghi nhận đúng số tiền khách hàng cần thanh toán."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5 sm:p-6">
          <SectionHeading title="Thông tin thanh toán" description="Hệ thống sẽ kiểm tra số tiền còn thiếu trước khi xác nhận giao dịch." />
          <Field id="cash-order-search" label="Tìm giao dịch chờ thanh toán" hint="Nhập mã giao dịch, họ tên hoặc mã hội viên mà khách cung cấp.">
            <div className="flex gap-2">
              <input id="cash-order-search" className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} placeholder="Mã giao dịch, tên hội viên hoặc mã hội viên" />
              <Button variant="secondary" loading={searching} icon={<MagnifyingGlass weight="bold" />} onClick={search}>Tra cứu</Button>
            </div>
          </Field>
          {results.length > 0 && (
            <div className="mb-5 grid gap-2">
              {results.map((order) => (
                <button key={order.id} type="button" className={`cash-order-result ${id === String(order.id) ? 'is-selected' : ''}`} onClick={() => selectOrder(order)}>
                  <span><strong>{order.memberName}</strong><small>{order.memberCode} · {order.orderNumber}</small></span>
                  <span><strong>{order.remainingAmount.toLocaleString('vi-VN')} đ</strong><small>{order.itemNames.join(', ')}</small></span>
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cash-order-id" label="Mã giao dịch" required>
              <input id="cash-order-id" className={inputClass} value={selectedOrderNumber || id} onChange={(event) => { setSelectedOrderNumber(''); setId(event.target.value); }} placeholder="Tự điền sau khi chọn giao dịch" />
            </Field>
            <Field id="cash-amount" label="Số tiền đã nhận" required hint="Số tiền được tự động định dạng theo VND.">
              <CurrencyInput id="cash-amount" className={inputClass} value={amount} onValueChange={setAmount} placeholder="Ví dụ: 1.200.000" />
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
            {['Xác nhận đúng mã giao dịch', 'Đếm và đối chiếu số tiền nhận', 'Xác nhận giao dịch và giao hóa đơn'].map((step, index) => (
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
