import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type PayrollEntry } from '../payrollApi';
import { CurrencyInput } from '../../../components/ui/LocalizedInputs';
import { parseApiError } from '../../training/errors';

const vnd = (value: number | string) =>
  `${new Intl.NumberFormat('vi-VN').format(Number(value))} ₫`;
const monthNow = () =>
  new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);
const lastCompletedMonth = () => {
  const current = monthNow();
  return new Date(Date.UTC(Number(current.slice(0, 4)), Number(current.slice(5, 7)) - 1, 0)).toISOString().slice(0, 7);
};
const card = 'rounded-2xl border border-line bg-surface p-5 shadow-sm';
const input =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink';
const button =
  'rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50';

function EntryTable({ entries }: { entries: PayrollEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-3">Nhân sự</th>
            <th>Lương cơ bản</th>
            <th>Ca dự kiến / vắng</th>
            <th>Trừ vắng</th>
            <th>Bù ca</th>
            <th>Phụ cấp / khấu trừ</th>
            <th>Thực nhận</th>
            <th>Đối soát</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-line align-top">
              <td className="py-3 font-semibold">
                {entry.staffName}
                <small className="block font-normal text-muted">
                  {entry.staffCode ?? entry.role}
                </small>
              </td>
              <td>{vnd(entry.baseSalary)}</td>
              <td>
                {entry.scheduledUnits} / {entry.absentUnits}
              </td>
              <td>{vnd(entry.absenceDeduction)}</td>
              <td>{vnd(entry.makeupCredit)}</td>
              <td>
                {vnd(entry.allowanceTotal)} / {vnd(entry.deductionTotal)}
              </td>
              <td className="font-bold text-primary">{vnd(entry.netAmount)}</td>
              <td
                className={
                  entry.reviewIssues.length ? 'text-red-600' : 'text-green-700'
                }
              >
                {entry.reviewIssues.length
                  ? entry.reviewIssues.join('; ')
                  : 'Đã đủ căn cứ'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PayrollPage() {
  const [month, setMonth] = useState(lastCompletedMonth);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [baseSalary, setBaseSalary] = useState('');
  const [compensationEnd, setCompensationEnd] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemEnd, setItemEnd] = useState('');
  const [itemKind, setItemKind] = useState<'ALLOWANCE' | 'DEDUCTION'>(
    'ALLOWANCE',
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  const period = useQuery({
    queryKey: ['payroll', month],
    queryFn: () => payrollApi.period(month),
    retry: false,
  });
  const performance = useQuery({
    queryKey: ['staff-performance-payroll'],
    queryFn: async () =>
      (await import('../api')).getStaffPerformance({
        from: `${monthNow()}-01`,
        to: new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10),
      }),
  });
  const staff = [
    ...(performance.data?.coaches ?? []),
    ...(performance.data?.receptionists ?? []),
  ];
  const compensation = useQuery({
    queryKey: ['compensation', staffId],
    queryFn: () => payrollApi.compensations(staffId!),
    enabled: staffId !== null,
  });
  const recurring = useQuery({
    queryKey: ['recurring', staffId],
    queryFn: () => payrollApi.recurring(staffId!),
    enabled: staffId !== null,
  });
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success);
      await cache.invalidateQueries({ queryKey: ['payroll'] });
      await cache.invalidateQueries({ queryKey: ['compensation'] });
      await cache.invalidateQueries({ queryKey: ['recurring'] });
    } catch (error) {
      setMessage(parseApiError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const locked = period.data?.status === 'APPROVED';
  const issues =
    period.data?.entries.reduce(
      (sum, entry) => sum + entry.reviewIssues.length,
      0,
    ) ?? 0;
  return (
    <div className="mx-auto max-w-7xl space-y-6 text-ink">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          Nhân sự · tài chính
        </span>
        <h1 className="mt-2 text-3xl font-bold">Hiệu suất & bảng lương</h1>
        <p className="mt-1 text-muted">
          Đối soát ca làm, buổi dạy và các khoản lương theo tháng. Kỳ đã duyệt
          được khóa số liệu.
        </p>
      </header>
      {message && (
        <div role="status" className={card}>
          {message}
        </div>
      )}
      <section className={`${card} grid gap-4 md:grid-cols-[180px_1fr]`}>
        <label className="text-sm font-semibold">
          Kỳ lương
          <input
            className={`${input} mt-2`}
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button
            className={button}
            disabled={busy || locked}
            onClick={() =>
              run(() => payrollApi.build(month), 'Đã tính bảng lương nháp.')
            }
          >
            Tính lại kỳ lương
          </button>
          <button
            className={button}
            disabled={busy || !period.data || locked || issues > 0}
            onClick={() =>
              run(() => payrollApi.approve(month), 'Đã duyệt và khóa kỳ lương.')
            }
          >
            Duyệt kỳ lương
          </button>
          <button
            className="rounded-lg border border-line px-4 py-2 font-semibold"
            disabled={!period.data}
            onClick={() =>
              payrollApi.export(
                `/payroll/periods/${month}/export`,
                `Sportigo_BangLuong_${month}.xlsx`,
              )
            }
          >
            Xuất Excel
          </button>
          <button
            className="rounded-lg border border-line px-4 py-2 font-semibold"
            onClick={() =>
              payrollApi.export(
                `/payroll/performance/export?from=${month}-01&to=${new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)}`,
                `Sportigo_HieuSuat_${month}.xlsx`,
              )
            }
          >
            Xuất hiệu suất
          </button>
        </div>
      </section>
      <section className={card}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Bảng lương {month}</h2>
          <span className="rounded-full bg-canvas px-3 py-1 text-sm font-semibold">
            {locked ? 'Đã duyệt' : period.data ? 'Bản nháp' : 'Chưa lập'}
          </span>
        </div>
        {period.data ? (
          <>
            <p className="mb-4 text-sm text-muted">
              {period.data.entries.length} nhân sự · {issues} mục cần đối soát
            </p>
            <EntryTable entries={period.data.entries} />
          </>
        ) : (
          <p className="text-muted">
            Chưa có bảng lương tháng này. Sau khi tháng kết thúc, chọn “Tính lại
            kỳ lương”.
          </p>
        )}
      </section>
      <section className={card}>
        <h2 className="text-xl font-bold">Cấu hình lương nhân sự</h2>
        <p className="mb-4 text-sm text-muted">
          Lương cơ bản và phụ cấp/khấu trừ có hiệu lực từ tháng chọn. Kỳ đã
          duyệt không đổi khi cấu hình được cập nhật.
        </p>
        <select
          className={`${input} max-w-md`}
          value={staffId ?? ''}
          onChange={(event) => {
            setStaffId(event.target.value ? Number(event.target.value) : null);
            setBaseSalary('');
          }}
        >
          <option value="">Chọn Coach hoặc lễ tân</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName} · {person.staffCode}
            </option>
          ))}
        </select>
        {staffId !== null && (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Lương cơ bản</h3>
              <div className="flex gap-2">
                <CurrencyInput
                  className={input}
                  value={baseSalary || compensation.data?.[0]?.baseSalary || ''}
                  onValueChange={setBaseSalary}
                  aria-label="Lương cơ bản VND"
                />
                <button
                  className={button}
                  disabled={
                    busy || !(baseSalary || compensation.data?.[0]?.baseSalary)
                  }
                  onClick={() =>
                    run(
                      () =>
                        payrollApi.setCompensation(
                          staffId,
                          Number(
                            baseSalary || compensation.data?.[0]?.baseSalary,
                          ),
                          month,
                          compensationEnd || null,
                        ),
                      'Đã lưu mức lương.',
                    )
                  }
                >
                  Lưu
                </button>
              </div>
              <label className="mt-3 block text-sm text-muted">
                Hiệu lực đến tháng (để trống nếu chưa có hạn)
                <input
                  className={`${input} mt-1 max-w-52`}
                  type="month"
                  min={month}
                  value={compensationEnd}
                  onChange={(event) => setCompensationEnd(event.target.value)}
                />
              </label>
              <p className="mt-2 text-sm text-muted">
                {compensation.data
                  ?.map((v) => `${v.effectiveFromMonth}: ${vnd(v.baseSalary)}`)
                  .join(' · ') || 'Chưa có cấu hình'}
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Phụ cấp / khấu trừ định kỳ</h3>
              <div className="grid gap-2 sm:grid-cols-[1fr_130px_120px_auto]">
                <input
                  className={input}
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="Tên khoản"
                />
                <select
                  className={input}
                  value={itemKind}
                  onChange={(event) =>
                    setItemKind(event.target.value as typeof itemKind)
                  }
                >
                  <option value="ALLOWANCE">Phụ cấp</option>
                  <option value="DEDUCTION">Khấu trừ</option>
                </select>
                <CurrencyInput
                  className={input}
                  value={itemAmount}
                  onValueChange={setItemAmount}
                  placeholder="VND"
                />
                <button
                  className={button}
                  disabled={busy || !itemName || !itemAmount}
                  onClick={() =>
                    run(
                      () =>
                        payrollApi.createRecurring(staffId, {
                          name: itemName,
                          kind: itemKind,
                          amount: Number(itemAmount),
                          effectiveFromMonth: month,
                          effectiveToMonth: itemEnd || null,
                        }),
                      'Đã thêm khoản định kỳ.',
                    )
                  }
                >
                  Thêm
                </button>
              </div>
              <label className="mt-3 block text-sm text-muted">
                Hiệu lực đến tháng (tùy chọn)
                <input
                  className={`${input} mt-1 max-w-52`}
                  type="month"
                  min={month}
                  value={itemEnd}
                  onChange={(event) => setItemEnd(event.target.value)}
                />
              </label>
              <ul className="mt-2 space-y-1 text-sm">
                {recurring.data?.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2"
                  >
                    <span>
                      {v.name} · {vnd(v.amount)} · {v.effectiveFromMonth}–
                      {v.effectiveToMonth ?? 'hiện tại'}{' '}
                      {v.isActive ? '' : '(Đã tắt)'}
                    </span>
                    {v.isActive &&
                      v.effectiveFromMonth <= month &&
                      (!v.effectiveToMonth || v.effectiveToMonth >= month) && (
                        <button
                          className="text-sm font-semibold text-primary"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () =>
                                payrollApi.updateRecurring(
                                  v.id,
                                  v.effectiveFromMonth === month
                                    ? { isActive: false }
                                    : {
                                        effectiveToMonth: new Date(
                                          Date.UTC(
                                            Number(month.slice(0, 4)),
                                            Number(month.slice(5, 7)) - 1,
                                            0,
                                          ),
                                        )
                                          .toISOString()
                                          .slice(0, 7),
                                      },
                                ),
                              'Đã kết thúc khoản định kỳ.',
                            )
                          }
                        >
                          Kết thúc từ tháng {month}
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function MyPayslipsPage() {
  const query = useQuery({
    queryKey: ['my-payslips'],
    queryFn: payrollApi.myPayslips,
  });
  const performance = useQuery({
    queryKey: ['my-staff-performance'],
    queryFn: payrollApi.myPerformance,
  });
  const metrics: Record<string, string> = {
    groupSessionsHeld: 'Buổi nhóm',
    privateSessions: 'Buổi 1–1',
    assessments: 'Đánh giá học viên',
    activeTrainees: 'Học viên đang phụ trách',
    supportResolved: 'Yêu cầu đã xử lý',
    supportInProgress: 'Yêu cầu đang xử lý',
    cashPayments: 'Giao dịch tại quầy',
    membersCreated: 'Hội viên mới',
  };
  return (
    <div className="mx-auto max-w-5xl space-y-5 text-ink">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          Thu nhập cá nhân
        </span>
        <h1 className="mt-2 text-3xl font-bold">Hiệu suất & phiếu lương</h1>
        <p className="text-muted">
          Chỉ các kỳ đã được Center Manager duyệt mới hiển thị phiếu lương.
        </p>
      </header>
      {performance.data?.performance && (
        <section className={card}>
          <h2 className="mb-4 text-xl font-bold">
            Hiệu suất {performance.data.from} – {performance.data.to}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(metrics)
              .filter(([key]) => key in performance.data.performance!)
              .map(([key, label]) => (
                <div className="rounded-xl bg-canvas p-4" key={key}>
                  <span className="text-sm text-muted">{label}</span>
                  <strong className="block text-2xl">
                    {performance.data.performance?.[key] ?? '—'}
                  </strong>
                </div>
              ))}
          </div>
        </section>
      )}
      {query.isLoading && <p>Đang tải phiếu lương…</p>}
      {query.isError && <p role="alert">Không tải được phiếu lương.</p>}
      {query.data?.length === 0 && (
        <div className={card}>Chưa có phiếu lương được duyệt.</div>
      )}
      {query.data?.map((entry) => (
        <section className={card} key={entry.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Tháng {entry.period.month}</h2>
              <p className="text-sm text-muted">
                {entry.staffName} · {entry.staffCode}
              </p>
            </div>
            <button
              className="rounded-lg border border-line px-4 py-2 font-semibold"
              onClick={() =>
                payrollApi.export(
                  `/payroll/me/payslips/${entry.period.month}/pdf`,
                  `Sportigo_PhieuLuong_${entry.period.month}.pdf`,
                )
              }
            >
              Tải PDF
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              Lương cơ bản
              <strong className="block">{vnd(entry.baseSalary)}</strong>
            </div>
            <div>
              Trừ vắng
              <strong className="block">{vnd(entry.absenceDeduction)}</strong>
            </div>
            <div>
              Phụ cấp / bù ca
              <strong className="block">
                {vnd(Number(entry.allowanceTotal) + Number(entry.makeupCredit))}
              </strong>
            </div>
            <div>
              Thực nhận
              <strong className="block text-primary">
                {vnd(entry.netAmount)}
              </strong>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
