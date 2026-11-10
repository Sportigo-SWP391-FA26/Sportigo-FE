import { ArrowCounterClockwise, ArrowDown, ArrowUp, ChartBar, CurrencyCircleDollar, FilePdf, FileXls, Gift, MagnifyingGlass, Receipt, Wallet } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading, StatTile } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { CurrencyInput, DateInput, DateTimeInput } from '../../../components/ui/LocalizedInputs';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { financeApi, saveBlob, type Promotion, type RefundRequest, type RevenueFilters } from '../api';
import { AuditLogView } from '../components/AuditLogView';
import { OperationsCharts, RevenueCharts } from '../components/ReportCharts';

type View = 'revenue' | 'classes' | 'promotions' | 'refunds' | 'audit';
const money = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const copy: Record<View, [string, string]> = {
  revenue: ['Báo cáo doanh thu', 'Theo dõi dòng tiền đã xác nhận, hoàn tiền và doanh thu thuần của trung tâm.'],
  classes: ['Báo cáo vận hành lớp', 'So sánh sức chứa, waitlist, tỷ lệ lấp đầy và mức độ tham dự của từng lớp.'],
  promotions: ['Quản lý khuyến mãi', 'Kiểm soát mã ưu đãi, phạm vi áp dụng và thời gian hiệu lực.'],
  refunds: ['Yêu cầu hoàn tiền', 'Xét duyệt yêu cầu hợp lệ và hoàn tiền vào ví hội viên theo đúng quy trình.'],
  audit: ['Nhật ký hệ thống', 'Tra cứu các thay đổi quan trọng và người thực hiện trên hệ thống.'],
};
const tone = (status?: string) => status === 'ACTIVE' || status === 'APPROVED' || status === 'COMPLETED' ? 'success' : status === 'REQUESTED' || status === 'UNDER_REVIEW' ? 'warning' : status === 'REJECTED' || status === 'EXPIRED' ? 'danger' : 'neutral';

export function ManagerFinancePage({ view }: { view: View }) {
  const [revenueFilters, setRevenueFilters] = useState<RevenueFilters>(currentMonthFilters);
  const revenue = useQuery({ queryKey: ['revenue', revenueFilters], queryFn: () => financeApi.revenue(toRevenueApiFilters(revenueFilters)), enabled: view === 'revenue' && revenueFilters.from <= revenueFilters.to, placeholderData: (previous) => previous });
  const classes = useQuery({ queryKey: ['class-report'], queryFn: financeApi.classReport, enabled: view === 'classes' });
  const promotions = useQuery({ queryKey: ['promotions'], queryFn: financeApi.promotions, enabled: view === 'promotions' });
  const refunds = useQuery({ queryKey: ['refunds'], queryFn: financeApi.refunds, enabled: view === 'refunds' });
  const [search, setSearch] = useState('');
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<RefundRequest | null>(null);
  const filteredPromotions = useMemo(() => filterItems(promotions.data ?? [], search, (item) => `${item.code} ${item.name}`), [promotions.data, search]);

  return <div className="mx-auto w-full max-w-[1240px]">
    <PageHeader title={copy[view][0]} description={copy[view][1]} actions={view === 'promotions' ? <Button icon={<Gift />} onClick={() => setPromotionOpen(true)}>Tạo khuyến mãi</Button> : undefined} />
    {view === 'revenue' && <RevenueView query={revenue} filters={revenueFilters} onFiltersChange={setRevenueFilters} />}
    {view === 'classes' && <ClassReportView query={classes} />}
    {view === 'promotions' && <PromotionView query={promotions} items={filteredPromotions} search={search} onSearch={setSearch} />}
    {view === 'refunds' && <RefundView query={refunds} onReview={setReviewTarget} />}
    {view === 'audit' && <AuditLogView />}
    {promotionOpen && <PromotionDialog onClose={() => setPromotionOpen(false)} onSaved={() => promotions.refetch()} />}
    {reviewTarget && <RefundReviewDialog request={reviewTarget} onClose={() => setReviewTarget(null)} onSaved={() => refunds.refetch()} />}
  </div>;
}

function RevenueView({ query, filters, onFiltersChange }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof financeApi.revenue>>>>; filters: RevenueFilters; onFiltersChange: (filters: RevenueFilters) => void }) {
  const exportExcel = useMutation({ mutationFn: () => financeApi.revenueExcel(toRevenueApiFilters(filters)) });
  const invalidRange = filters.from > filters.to;
  const downloadExcel = async () => {
    if (invalidRange) return;
    try {
      const blob = await exportExcel.mutateAsync();
      saveBlob(blob, `Sportigo_BaoCaoTaiChinh_${filters.from.slice(0, 7)}.xlsx`);
      toast('Đã tải báo cáo tài chính Excel.');
    } catch {
      toast('Không thể xuất báo cáo. Vui lòng kiểm tra bộ lọc và thử lại.', 'error');
    }
  };
  const updateFilter = <K extends keyof RevenueFilters>(key: K, value: RevenueFilters[K]) => onFiltersChange({ ...filters, [key]: value || undefined });
  const resetFilters = () => onFiltersChange(currentMonthFilters());
  const filterPanel = <Card className="p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-extrabold text-ink">Kỳ báo cáo</h2><p className="mt-1 text-sm text-muted">Số liệu trên màn hình và file Excel luôn dùng cùng bộ lọc.</p></div>
      <Button size="sm" variant="secondary" icon={<ArrowCounterClockwise />} onClick={resetFilters}>Tháng hiện tại</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Field id="revenue-from" label="Từ ngày"><DateInput id="revenue-from" className={inputClass} value={filters.from} onValueChange={(value) => updateFilter('from', value)} /></Field>
      <Field id="revenue-to" label="Đến ngày"><DateInput id="revenue-to" className={inputClass} value={filters.to} onValueChange={(value) => updateFilter('to', value)} /></Field>
      <Field id="revenue-channel" label="Kênh thanh toán"><select id="revenue-channel" className={inputClass} value={filters.channel ?? ''} onChange={(event) => updateFilter('channel', event.target.value as RevenueFilters['channel'])}><option value="">Tất cả kênh</option><option value="ONLINE">VNPay</option><option value="COUNTER">Tiền mặt tại quầy</option><option value="WALLET">Ví Sportigo</option></select></Field>
      <Field id="revenue-service" label="Loại dịch vụ"><select id="revenue-service" className={inputClass} value={filters.itemType ?? ''} onChange={(event) => updateFilter('itemType', event.target.value as RevenueFilters['itemType'])}><option value="">Tất cả dịch vụ</option><option value="GROUP_CLASS">Lớp nhóm</option><option value="PRIVATE_COURSE">Khóa 1–1</option><option value="MEMBERSHIP">Gói membership</option></select></Field>
    </div>
    {invalidRange && <div className="mt-4"><InlineAlert>Ngày kết thúc phải từ ngày bắt đầu trở đi.</InlineAlert></div>}
  </Card>;
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải báo cáo doanh thu…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/reports/revenue" />;
  const data = query.data;
  const refundRate = data.gross ? Math.round((data.refunds / data.gross) * 100) : 0;
  return <div className="space-y-5">
    {filterPanel}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Doanh thu gộp" value={money(data.gross)} hint={`${data.transactions} giao dịch thành công`} icon={<CurrencyCircleDollar />} tone="primary" />
      <StatTile label="Đã hoàn vào ví" value={money(data.refunds)} hint={`${refundRate}% doanh thu gộp`} icon={<ArrowDown />} tone="energy" />
      <StatTile label="Doanh thu thuần" value={money(data.net)} hint="Sau khi trừ hoàn tiền" icon={<ArrowUp />} tone="lime" />
      <StatTile label="Số giao dịch" value={data.transactions.toLocaleString('vi-VN')} hint="Tất cả kênh thanh toán" icon={<Receipt />} tone="sky" />
    </div>
    <RevenueCharts data={data} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 sm:p-6"><SectionHeading title="Doanh thu theo kênh" description="Giá trị thanh toán thành công được phân bổ theo phương thức." />
        {Object.entries(data.byChannel).length === 0 ? <EmptyState compact title="Chưa có giao dịch" description="Dữ liệu sẽ xuất hiện sau khi có thanh toán thành công." /> : <div className="space-y-4">{Object.entries(data.byChannel).map(([channel, value]) => { const percent = data.gross ? Math.round((value / data.gross) * 100) : 0; return <div key={channel}><div className="mb-2 flex justify-between gap-3 text-sm"><strong>{channel}</strong><span className="tabular-nums text-muted">{money(value)} · {percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>; })}</div>}
      </Card>
      <Card className="p-5 sm:p-6"><SectionHeading title="Workbook tài chính" description="5 sheet đối soát, định dạng VND và sẵn sàng lọc trong Excel." /><div className="grid gap-3"><Button icon={<FileXls />} loading={exportExcel.isPending} disabled={invalidRange} onClick={downloadExcel}>Xuất báo cáo Excel</Button><Button variant="secondary" icon={<FilePdf />} disabled={invalidRange} onClick={async () => saveBlob(await financeApi.reportFile('revenue', 'pdf', toRevenueApiFilters(filters)), 'sportigo-revenue.pdf')}>Xuất PDF tóm tắt</Button></div>{exportExcel.isError && <div className="mt-3"><InlineAlert>Xuất file chưa thành công. Hãy thử lại sau.</InlineAlert></div>}</Card>
    </div>
  </div>;
}

function currentMonthFilters(): RevenueFilters {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${String(month).padStart(2, '0')}-01`, to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
}

function toRevenueApiFilters(filters: RevenueFilters): RevenueFilters {
  return {
    ...filters,
    from: new Date(`${filters.from}T00:00:00+07:00`).toISOString(),
    to: new Date(`${filters.to}T23:59:59.999+07:00`).toISOString(),
  };
}

function ClassReportView({ query }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof financeApi.classReport>>>> }) {
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải báo cáo lớp…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/reports/classes" />;
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><StatTile label="Lớp có dữ liệu" value={query.data.length.toLocaleString('vi-VN')} hint="Lớp trong báo cáo" icon={<ChartBar />} tone="primary" /><StatTile label="Học viên xác nhận" value={query.data.reduce((sum, row) => sum + row.confirmed, 0).toLocaleString('vi-VN')} hint="Tổng theo từng lớp" icon={<Receipt />} tone="sky" /><StatTile label="Đang chờ" value={query.data.reduce((sum, row) => sum + row.waitlist, 0).toLocaleString('vi-VN')} hint="Lượt trong waitlist" icon={<ArrowUp />} tone="energy" /></div>{query.data.length > 0 && <OperationsCharts rows={query.data} />}<Card className="p-5 sm:p-6"><SectionHeading title="Hiệu suất từng lớp" description={`${query.data.length} lớp có dữ liệu vận hành.`} actions={<div className="flex gap-2"><Button size="sm" icon={<FileXls />} onClick={async () => saveBlob(await financeApi.reportFile('classes', 'xlsx'), 'sportigo-classes.xlsx')}>Excel</Button><Button size="sm" variant="secondary" icon={<FilePdf />} onClick={async () => saveBlob(await financeApi.reportFile('classes', 'pdf'), 'sportigo-classes.pdf')}>PDF</Button></div>} />
    {query.data.length === 0 ? <EmptyState compact icon={<ChartBar />} title="Chưa có dữ liệu lớp" description="Báo cáo sẽ xuất hiện khi lớp có đăng ký và điểm danh." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[760px]"><thead><tr><th>Lớp học</th><th>Học viên</th><th>Waitlist</th><th>Lấp đầy</th><th>Tham dự</th></tr></thead><tbody>{query.data.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.confirmed}/{item.capacity}</td><td>{item.waitlist}</td><td><Rate value={item.occupancyRate} /></td><td><Rate value={item.attendanceRate} /></td></tr>)}</tbody></table></div>}
  </Card></div>;
}

function PromotionView({ query, items, search, onSearch }: { query: ReturnType<typeof useQuery<Promotion[]>>; items: Promotion[]; search: string; onSearch: (value: string) => void }) {
  const update = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => financeApi.updatePromotion(id, { status }), onSuccess: async () => { toast('Đã cập nhật trạng thái chương trình.'); await query.refetch(); } });
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải khuyến mãi…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/promotions" />;
  return <><SearchBar value={search} onChange={onSearch} placeholder="Tìm theo mã hoặc tên chương trình" /><Card className="p-5 sm:p-6"><SectionHeading title="Danh sách khuyến mãi" description={`${items.length} chương trình phù hợp.`} />
    {items.length === 0 ? <EmptyState compact icon={<Gift />} title="Không có khuyến mãi phù hợp" description="Thử từ khóa khác hoặc tạo chương trình mới." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[820px]"><thead><tr><th>Mã</th><th>Chương trình</th><th>Ưu đãi</th><th>Phạm vi xem</th><th>Hiệu lực</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><code className="rounded bg-canvas px-2 py-1 text-xs font-bold text-primary-deep">{item.code}</code></td><td><strong>{item.name}</strong></td><td>{item.discountType === 'PERCENTAGE' ? `${Number(item.discountValue)}%` : money(item.discountValue)}</td><td><Chip tone={item.isPublic ? 'success' : 'neutral'}>{item.isPublic ? 'Công khai' : 'Nội bộ'}</Chip></td><td>{new Date(item.startAt).toLocaleDateString('vi-VN')} – {new Date(item.endAt).toLocaleDateString('vi-VN')}</td><td><Chip tone={tone(item.status)} dot>{item.status}</Chip></td><td className="text-right"><Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: item.id, status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{item.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}</Button></td></tr>)}</tbody></table></div>}
  </Card></>;
}

function RefundView({ query, onReview }: { query: ReturnType<typeof useQuery<RefundRequest[]>>; onReview: (item: RefundRequest) => void }) {
  const complete = useMutation({ mutationFn: financeApi.completeRefund, onSuccess: async () => { toast('Đã cộng tiền hoàn vào ví hội viên.'); await query.refetch(); } });
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải yêu cầu hoàn tiền…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/refund-requests" />;
  return <Card className="p-5 sm:p-6"><SectionHeading title="Hàng đợi hoàn tiền" description={`${query.data.length} yêu cầu trong hệ thống.`} />
    {query.data.length === 0 ? <EmptyState compact icon={<Wallet />} title="Không có yêu cầu hoàn tiền" description="Các yêu cầu mới từ hội viên sẽ xuất hiện tại đây." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[980px]"><thead><tr><th>Hội viên</th><th>Đơn hàng</th><th>Dịch vụ</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{query.data.map((item) => <tr key={item.id}><td><strong>{item.member.user.displayName}</strong><small>{item.member.user.email}</small></td><td>{item.orderItem.order.orderNumber}</td><td><strong>{item.orderItem.itemNameSnapshot}</strong></td><td className="font-bold tabular-nums">{money(item.requestedAmount)}</td><td className="max-w-[260px] text-muted">{item.reason}</td><td><Chip tone={tone(item.status)} dot>{item.status}</Chip></td><td><div className="flex justify-end gap-2">{item.status === 'REQUESTED' && <Button size="sm" onClick={() => onReview(item)}>Xét duyệt</Button>}{item.status === 'APPROVED' && <Button size="sm" loading={complete.isPending} onClick={() => complete.mutate(item.id)}>Cộng vào ví</Button>}</div></td></tr>)}</tbody></table></div>}
  </Card>;
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <Card className="manager-filter-bar mb-5 p-3 sm:p-4"><label className="relative block"><span className="sr-only">Tìm kiếm</span><MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className={`${inputClass} pl-9`} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label></Card>;
}
function Rate({ value }: { value: number }) { const percent = Math.round(value * 100); return <div className="min-w-28"><span className="text-xs">{percent}%</span><div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} /></div></div>; }
function filterItems<T>(items: T[], search: string, value: (item: T) => string) { const term = search.trim().toLocaleLowerCase('vi'); return items.filter((item) => !term || value(item).toLocaleLowerCase('vi').includes(term)); }

function PromotionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<unknown> }) {
  const create = useMutation({ mutationFn: financeApi.createPromotion });
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); await create.mutateAsync({ code: String(values.get('code')).trim().toUpperCase(), name: String(values.get('name')).trim(), discountType: 'PERCENTAGE', discountValue: Number(values.get('discountValue')), minOrderAmount: Number(values.get('minOrderAmount')), applicableType: String(values.get('applicableType')), startAt: new Date(String(values.get('startAt'))).toISOString(), endAt: new Date(String(values.get('endAt'))).toISOString(), isPublic: values.get('isPublic') === 'on', status: 'ACTIVE' }); await onSaved(); toast('Đã tạo chương trình khuyến mãi.'); onClose(); };
  return <Dialog open onClose={onClose} title="Tạo khuyến mãi" description="Mã được áp dụng cho đơn hàng hợp lệ trong thời gian đã chọn." footer={<><Button variant="secondary" onClick={onClose}>Đóng</Button><Button type="submit" form="promotion-form" loading={create.isPending}>Tạo chương trình</Button></>}><form id="promotion-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><Field id="promotion-code" label="Mã khuyến mãi" required><input id="promotion-code" name="code" className={inputClass} required /></Field><Field id="promotion-value" label="Mức giảm (%)" required><input id="promotion-value" name="discountValue" type="number" min="1" max="100" className={inputClass} required /></Field><Field id="promotion-scope" label="Áp dụng cho" required className="sm:col-span-2"><select id="promotion-scope" name="applicableType" className={inputClass} defaultValue="ALL"><option value="ALL">Tất cả dịch vụ</option><option value="MEMBERSHIP">Gói membership</option><option value="GROUP_CLASS">Lớp nhóm</option><option value="PRIVATE_COURSE">Khóa 1–1</option></select></Field><Field id="promotion-name" label="Tên chương trình" required className="sm:col-span-2"><input id="promotion-name" name="name" className={inputClass} required /></Field><Field id="promotion-min" label="Đơn tối thiểu"><CurrencyInput id="promotion-min" name="minOrderAmount" value={minOrderAmount} onValueChange={setMinOrderAmount} className={inputClass} /></Field><label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-ink"><input name="isPublic" type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />Công khai cho hội viên và lễ tân</label><Field id="promotion-start" label="Bắt đầu" required><DateTimeInput id="promotion-start" name="startAt" value={startAt} onValueChange={setStartAt} className={inputClass} required /></Field><Field id="promotion-end" label="Kết thúc" required><DateTimeInput id="promotion-end" name="endAt" value={endAt} onValueChange={setEndAt} className={inputClass} required /></Field>{create.isError && <div className="sm:col-span-2"><InlineAlert>Không thể tạo khuyến mãi. Kiểm tra dữ liệu và thử lại.</InlineAlert></div>}</form></Dialog>;
}

function RefundReviewDialog({ request, onClose, onSaved }: { request: RefundRequest; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const review = useMutation({ mutationFn: ({ amount, note }: { amount: number; note: string }) => financeApi.reviewRefund(request.id, 'APPROVE', note, amount) });
  const [amount, setAmount] = useState(String(request.requestedAmount));
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); await review.mutateAsync({ amount: Number(values.get('amount')), note: String(values.get('note')).trim() }); await onSaved(); toast('Đã duyệt yêu cầu hoàn tiền.'); onClose(); };
  return <Dialog open onClose={onClose} title="Duyệt hoàn tiền" description={`${request.member.user.displayName} · ${request.orderItem.order.orderNumber} · ${request.orderItem.itemNameSnapshot}`} footer={<><Button variant="secondary" onClick={onClose}>Đóng</Button><Button type="submit" form="refund-review-form" loading={review.isPending}>Duyệt yêu cầu</Button></>}><form id="refund-review-form" className="space-y-4" onSubmit={submit}><Field id="refund-amount" label="Số tiền hoàn vào ví" required><CurrencyInput id="refund-amount" name="amount" value={amount} onValueChange={setAmount} className={inputClass} required /></Field><Field id="refund-note" label="Ghi chú xét duyệt" required><textarea id="refund-note" name="note" className={`${inputClass} min-h-24 py-2.5`} defaultValue="Đã kiểm tra điều kiện hủy dịch vụ." required /></Field>{review.isError && <InlineAlert>Không thể duyệt yêu cầu. Kiểm tra trạng thái và thử lại.</InlineAlert>}</form></Dialog>;
}
