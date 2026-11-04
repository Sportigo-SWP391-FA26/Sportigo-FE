import { ArrowDown, ArrowUp, ChartBar, CurrencyCircleDollar, FilePdf, FileXls, Gift, MagnifyingGlass, Receipt, Wallet } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading, StatTile } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { financeApi, saveBlob, type Promotion, type RefundRequest } from '../api';
import { AuditLogView } from '../components/AuditLogView';

type View = 'revenue' | 'classes' | 'promotions' | 'refunds' | 'audit';
const money = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const copy: Record<View, [string, string]> = {
  revenue: ['Báo cáo doanh thu', 'Theo dõi dòng tiền đã xác nhận, hoàn tiền và doanh thu thuần của trung tâm.'],
  classes: ['Báo cáo vận hành lớp', 'So sánh sức chứa, waitlist, tỷ lệ lấp đầy và mức độ tham dự của từng lớp.'],
  promotions: ['Quản lý khuyến mãi', 'Kiểm soát mã ưu đãi, phạm vi áp dụng và thời gian hiệu lực.'],
  refunds: ['Yêu cầu hoàn tiền', 'Xét duyệt yêu cầu hợp lệ và hoàn tiền vào ví hội viên theo đúng quy trình.'],
  audit: ['Nhật ký hệ thống', 'Tra cứu các thay đổi quan trọng và người thực hiện trên hệ thống.'],
};
const tone = (status: string) => status === 'ACTIVE' || status === 'APPROVED' || status === 'COMPLETED' ? 'success' : status === 'REQUESTED' || status === 'UNDER_REVIEW' ? 'warning' : status === 'REJECTED' || status === 'EXPIRED' ? 'danger' : 'neutral';

export function ManagerFinancePage({ view }: { view: View }) {
  const revenue = useQuery({ queryKey: ['revenue'], queryFn: financeApi.revenue, enabled: view === 'revenue' });
  const classes = useQuery({ queryKey: ['class-report'], queryFn: financeApi.classReport, enabled: view === 'classes' });
  const promotions = useQuery({ queryKey: ['promotions'], queryFn: financeApi.promotions, enabled: view === 'promotions' });
  const refunds = useQuery({ queryKey: ['refunds'], queryFn: financeApi.refunds, enabled: view === 'refunds' });
  const [search, setSearch] = useState('');
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<RefundRequest | null>(null);
  const filteredPromotions = useMemo(() => filterItems(promotions.data ?? [], search, (item) => `${item.code} ${item.name}`), [promotions.data, search]);

  return <div className="mx-auto w-full max-w-[1240px]">
    <PageHeader title={copy[view][0]} description={copy[view][1]} actions={view === 'promotions' ? <Button icon={<Gift />} onClick={() => setPromotionOpen(true)}>Tạo khuyến mãi</Button> : undefined} />
    {view === 'revenue' && <RevenueView query={revenue} />}
    {view === 'classes' && <ClassReportView query={classes} />}
    {view === 'promotions' && <PromotionView query={promotions} items={filteredPromotions} search={search} onSearch={setSearch} />}
    {view === 'refunds' && <RefundView query={refunds} onReview={setReviewTarget} />}
    {view === 'audit' && <AuditLogView />}
    {promotionOpen && <PromotionDialog onClose={() => setPromotionOpen(false)} onSaved={() => promotions.refetch()} />}
    {reviewTarget && <RefundReviewDialog request={reviewTarget} onClose={() => setReviewTarget(null)} onSaved={() => refunds.refetch()} />}
  </div>;
}

function RevenueView({ query }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof financeApi.revenue>>>> }) {
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải báo cáo doanh thu…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/reports/revenue" />;
  const data = query.data;
  const refundRate = data.gross ? Math.round((data.refunds / data.gross) * 100) : 0;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Doanh thu gộp" value={money(data.gross)} hint={`${data.transactions} giao dịch thành công`} icon={<CurrencyCircleDollar />} tone="primary" />
      <StatTile label="Đã hoàn vào ví" value={money(data.refunds)} hint={`${refundRate}% doanh thu gộp`} icon={<ArrowDown />} tone="energy" />
      <StatTile label="Doanh thu thuần" value={money(data.net)} hint="Sau khi trừ hoàn tiền" icon={<ArrowUp />} tone="lime" />
      <StatTile label="Số giao dịch" value={data.transactions.toLocaleString('vi-VN')} hint="Tất cả kênh thanh toán" icon={<Receipt />} tone="sky" />
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 sm:p-6"><SectionHeading title="Doanh thu theo kênh" description="Giá trị thanh toán thành công được phân bổ theo phương thức." />
        {Object.entries(data.byChannel).length === 0 ? <EmptyState compact title="Chưa có giao dịch" description="Dữ liệu sẽ xuất hiện sau khi có thanh toán thành công." /> : <div className="space-y-4">{Object.entries(data.byChannel).map(([channel, value]) => { const percent = data.gross ? Math.round((value / data.gross) * 100) : 0; return <div key={channel}><div className="mb-2 flex justify-between gap-3 text-sm"><strong>{channel}</strong><span className="tabular-nums text-muted">{money(value)} · {percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>; })}</div>}
      </Card>
      <Card className="p-5 sm:p-6"><SectionHeading title="Xuất báo cáo" description="Tải dữ liệu hiện tại để đối soát hoặc trình bày." /><div className="grid gap-3"><Button icon={<FileXls />} onClick={async () => saveBlob(await financeApi.revenueExcel(), 'sportigo-revenue.xlsx')}>Xuất Excel</Button><Button variant="secondary" icon={<FilePdf />} onClick={async () => saveBlob(await financeApi.reportFile('revenue', 'pdf'), 'sportigo-revenue.pdf')}>Xuất PDF</Button></div></Card>
    </div>
  </div>;
}

function ClassReportView({ query }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof financeApi.classReport>>>> }) {
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải báo cáo lớp…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/reports/classes" />;
  return <Card className="p-5 sm:p-6"><SectionHeading title="Hiệu suất lớp học" description={`${query.data.length} lớp có dữ liệu vận hành.`} actions={<div className="flex gap-2"><Button size="sm" icon={<FileXls />} onClick={async () => saveBlob(await financeApi.reportFile('classes', 'xlsx'), 'sportigo-classes.xlsx')}>Excel</Button><Button size="sm" variant="secondary" icon={<FilePdf />} onClick={async () => saveBlob(await financeApi.reportFile('classes', 'pdf'), 'sportigo-classes.pdf')}>PDF</Button></div>} />
    {query.data.length === 0 ? <EmptyState compact icon={<ChartBar />} title="Chưa có dữ liệu lớp" description="Báo cáo sẽ xuất hiện khi lớp có đăng ký và điểm danh." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[760px]"><thead><tr><th>Lớp học</th><th>Học viên</th><th>Waitlist</th><th>Lấp đầy</th><th>Tham dự</th></tr></thead><tbody>{query.data.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.confirmed}/{item.capacity}</td><td>{item.waitlist}</td><td><Rate value={item.occupancyRate} /></td><td><Rate value={item.attendanceRate} /></td></tr>)}</tbody></table></div>}
  </Card>;
}

function PromotionView({ query, items, search, onSearch }: { query: ReturnType<typeof useQuery<Promotion[]>>; items: Promotion[]; search: string; onSearch: (value: string) => void }) {
  const update = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => financeApi.updatePromotion(id, { status }), onSuccess: async () => { toast('Đã cập nhật trạng thái chương trình.'); await query.refetch(); } });
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải khuyến mãi…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/promotions" />;
  return <><SearchBar value={search} onChange={onSearch} placeholder="Tìm theo mã hoặc tên chương trình" /><Card className="p-5 sm:p-6"><SectionHeading title="Danh sách khuyến mãi" description={`${items.length} chương trình phù hợp.`} />
    {items.length === 0 ? <EmptyState compact icon={<Gift />} title="Không có khuyến mãi phù hợp" description="Thử từ khóa khác hoặc tạo chương trình mới." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[720px]"><thead><tr><th>Mã</th><th>Chương trình</th><th>Ưu đãi</th><th>Hiệu lực</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><code className="rounded bg-canvas px-2 py-1 text-xs font-bold text-primary-deep">{item.code}</code></td><td><strong>{item.name}</strong></td><td>{item.discountType === 'PERCENTAGE' ? `${Number(item.discountValue)}%` : money(item.discountValue)}</td><td>{new Date(item.startAt).toLocaleDateString('vi-VN')} – {new Date(item.endAt).toLocaleDateString('vi-VN')}</td><td><Chip tone={tone(item.status)} dot>{item.status}</Chip></td><td className="text-right"><Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: item.id, status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{item.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}</Button></td></tr>)}</tbody></table></div>}
  </Card></>;
}

function RefundView({ query, onReview }: { query: ReturnType<typeof useQuery<RefundRequest[]>>; onReview: (item: RefundRequest) => void }) {
  const complete = useMutation({ mutationFn: financeApi.completeRefund, onSuccess: async () => { toast('Đã cộng tiền hoàn vào ví hội viên.'); await query.refetch(); } });
  if (query.isPending) return <ListSkeleton rows={5} label="Đang tải yêu cầu hoàn tiền…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/refund-requests" />;
  return <Card className="p-5 sm:p-6"><SectionHeading title="Hàng đợi hoàn tiền" description={`${query.data.length} yêu cầu trong hệ thống.`} />
    {query.data.length === 0 ? <EmptyState compact icon={<Wallet />} title="Không có yêu cầu hoàn tiền" description="Các yêu cầu mới từ hội viên sẽ xuất hiện tại đây." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[900px]"><thead><tr><th>Hội viên</th><th>Đơn hàng</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{query.data.map((item) => <tr key={item.id}><td><strong>{item.member.user.displayName}</strong><small>{item.member.user.email}</small></td><td>{item.payment.order.orderNumber}</td><td className="font-bold tabular-nums">{money(item.requestedAmount)}</td><td className="max-w-[260px] text-muted">{item.reason}</td><td><Chip tone={tone(item.status)} dot>{item.status}</Chip></td><td><div className="flex justify-end gap-2">{item.status === 'REQUESTED' && <Button size="sm" onClick={() => onReview(item)}>Xét duyệt</Button>}{item.status === 'APPROVED' && <Button size="sm" loading={complete.isPending} onClick={() => complete.mutate(item.id)}>Cộng vào ví</Button>}</div></td></tr>)}</tbody></table></div>}
  </Card>;
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <Card className="manager-filter-bar mb-5 p-3 sm:p-4"><label className="relative block"><span className="sr-only">Tìm kiếm</span><MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className={`${inputClass} pl-9`} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label></Card>;
}
function Rate({ value }: { value: number }) { const percent = Math.round(value * 100); return <div className="min-w-28"><span className="text-xs">{percent}%</span><div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} /></div></div>; }
function filterItems<T>(items: T[], search: string, value: (item: T) => string) { const term = search.trim().toLocaleLowerCase('vi'); return items.filter((item) => !term || value(item).toLocaleLowerCase('vi').includes(term)); }

function PromotionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<unknown> }) {
  const create = useMutation({ mutationFn: financeApi.createPromotion });
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); await create.mutateAsync({ code: String(values.get('code')).trim().toUpperCase(), name: String(values.get('name')).trim(), discountType: 'PERCENTAGE', discountValue: Number(values.get('discountValue')), minOrderAmount: Number(values.get('minOrderAmount')), applicableType: 'ALL', startAt: new Date(String(values.get('startAt'))).toISOString(), endAt: new Date(String(values.get('endAt'))).toISOString(), status: 'ACTIVE' }); await onSaved(); toast('Đã tạo chương trình khuyến mãi.'); onClose(); };
  return <Dialog open onClose={onClose} title="Tạo khuyến mãi" description="Mã được áp dụng cho đơn hàng hợp lệ trong thời gian đã chọn." footer={<><Button variant="secondary" onClick={onClose}>Đóng</Button><Button type="submit" form="promotion-form" loading={create.isPending}>Tạo chương trình</Button></>}><form id="promotion-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><Field id="promotion-code" label="Mã khuyến mãi" required><input id="promotion-code" name="code" className={inputClass} required /></Field><Field id="promotion-value" label="Mức giảm (%)" required><input id="promotion-value" name="discountValue" type="number" min="1" max="100" className={inputClass} required /></Field><Field id="promotion-name" label="Tên chương trình" required className="sm:col-span-2"><input id="promotion-name" name="name" className={inputClass} required /></Field><Field id="promotion-min" label="Đơn tối thiểu"><input id="promotion-min" name="minOrderAmount" type="number" min="0" defaultValue="0" className={inputClass} /></Field><div /><Field id="promotion-start" label="Bắt đầu" required><input id="promotion-start" name="startAt" type="datetime-local" className={inputClass} required /></Field><Field id="promotion-end" label="Kết thúc" required><input id="promotion-end" name="endAt" type="datetime-local" className={inputClass} required /></Field>{create.isError && <div className="sm:col-span-2"><InlineAlert>Không thể tạo khuyến mãi. Kiểm tra dữ liệu và thử lại.</InlineAlert></div>}</form></Dialog>;
}

function RefundReviewDialog({ request, onClose, onSaved }: { request: RefundRequest; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const review = useMutation({ mutationFn: ({ amount, note }: { amount: number; note: string }) => financeApi.reviewRefund(request.id, 'APPROVE', note, amount) });
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); await review.mutateAsync({ amount: Number(values.get('amount')), note: String(values.get('note')).trim() }); await onSaved(); toast('Đã duyệt yêu cầu hoàn tiền.'); onClose(); };
  return <Dialog open onClose={onClose} title="Duyệt hoàn tiền" description={`${request.member.user.displayName} · ${request.payment.order.orderNumber}`} footer={<><Button variant="secondary" onClick={onClose}>Đóng</Button><Button type="submit" form="refund-review-form" loading={review.isPending}>Duyệt yêu cầu</Button></>}><form id="refund-review-form" className="space-y-4" onSubmit={submit}><Field id="refund-amount" label="Số tiền hoàn vào ví" required><input id="refund-amount" name="amount" type="number" min="1" max={Number(request.requestedAmount)} defaultValue={request.requestedAmount} className={inputClass} required /></Field><Field id="refund-note" label="Ghi chú xét duyệt" required><textarea id="refund-note" name="note" className={`${inputClass} min-h-24 py-2.5`} defaultValue="Đã kiểm tra điều kiện hủy dịch vụ." required /></Field>{review.isError && <InlineAlert>Không thể duyệt yêu cầu. Kiểm tra trạng thái và thử lại.</InlineAlert>}</form></Dialog>;
}
