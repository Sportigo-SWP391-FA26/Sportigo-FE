import { ArrowCounterClockwise, Eye, Funnel, ShieldCheck } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Pagination } from '../../../components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { financeApi, type AuditLogItem, type AuditQuery } from '../api';

const actionLabels: Record<string, string> = {
  STAFF_CREATED: 'Tạo tài khoản nhân sự', STAFF_UPDATED: 'Cập nhật nhân sự', USER_ACTIVATED: 'Kích hoạt tài khoản',
  USER_LOCKED: 'Khóa tài khoản', USER_UNLOCKED: 'Mở khóa tài khoản', USER_DELETED: 'Xóa tài khoản',
  MEMBER_CREATED: 'Tạo tài khoản hội viên', PAYMENT_CREATED: 'Tạo thanh toán', PAYMENT_COMPLETED: 'Hoàn tất thanh toán',
  REFUND_REQUESTED: 'Yêu cầu hoàn tiền', REFUND_APPROVED: 'Duyệt hoàn tiền', REFUND_COMPLETED: 'Hoàn tất hoàn tiền',
  PROMOTION_CREATED: 'Tạo khuyến mãi', PROMOTION_UPDATED: 'Cập nhật khuyến mãi', CLASS_CREATED: 'Tạo lớp học',
  CLASS_UPDATED: 'Cập nhật lớp học', ATTENDANCE_MARKED: 'Ghi nhận điểm danh', WORKOUT_PLAN_CREATED: 'Tạo giáo án',
  COACH_SPORT_ASSIGNED: 'Phân công chuyên môn cho Coach', UPDATE_GROUP_CLASS: 'Cập nhật lớp nhóm',
  COLLECT_CASH_PAYMENT: 'Thu tiền mặt tại quầy', CREATE_PROMOTION: 'Tạo chương trình khuyến mãi',
};

const entityLabels: Record<string, string> = {
  User: 'Tài khoản', Payment: 'Thanh toán', ServiceOrder: 'Đơn hàng', RefundRequest: 'Yêu cầu hoàn tiền',
  Promotion: 'Khuyến mãi', GroupClass: 'Lớp nhóm', PrivateCourse: 'Khóa 1–1', SessionAttendance: 'Điểm danh', WorkoutPlan: 'Giáo án',
  COACH_SPORT: 'Chuyên môn Coach',
};

const labelAction = (value: string) => actionLabels[value] ?? value.toLowerCase().replaceAll('_', ' ');
const labelEntity = (value: string) => entityLabels[value] ?? value;
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN');
const toneForAction = (action: string) => action.includes('DELETED') || action.includes('REJECTED') ? 'danger' : action.includes('CREATED') || action.includes('ACTIVATED') || action.includes('COMPLETED') ? 'success' : action.includes('LOCKED') || action.includes('REFUND') ? 'warning' : 'neutral';

export function AuditLogView() {
  const [filters, setFilters] = useState<AuditQuery>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const query = useQuery({ queryKey: ['audit', filters], queryFn: () => financeApi.audit(filters) });

  if (query.isPending) return <ListSkeleton rows={7} label="Đang tải nhật ký hệ thống…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/audit-logs" />;
  const data = query.data;
  const facets = data.facets ?? { actions: [], entityTypes: [] };
  const activeFilters = Number(Boolean(filters.action)) + Number(Boolean(filters.entityType)) + Number(Boolean(filters.from)) + Number(Boolean(filters.to));

  return <div className="space-y-5">
    <Card className="manager-filter-bar p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><h2 className="font-extrabold text-ink">Bộ lọc nhật ký</h2><p className="mt-1 text-sm text-muted">Lọc trực tiếp trên toàn bộ dữ liệu hệ thống.</p></div>
        {activeFilters > 0 && <Button size="sm" variant="ghost" icon={<ArrowCounterClockwise />} onClick={() => setFilters({ page: 1, limit: 20 })}>Đặt lại</Button>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label><span className="mb-1.5 block text-xs font-bold text-muted">Hành động</span><select className={inputClass} value={filters.action ?? ''} onChange={(event) => setFilters((current) => ({ ...current, page: 1, action: event.target.value || undefined }))}><option value="">Tất cả hành động</option>{facets.actions.map((action) => <option key={action} value={action}>{labelAction(action)}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-bold text-muted">Đối tượng</span><select className={inputClass} value={filters.entityType ?? ''} onChange={(event) => setFilters((current) => ({ ...current, page: 1, entityType: event.target.value || undefined }))}><option value="">Tất cả đối tượng</option>{facets.entityTypes.map((entity) => <option key={entity} value={entity}>{labelEntity(entity)}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-bold text-muted">Từ ngày</span><input type="date" className={inputClass} value={filters.from?.slice(0, 10) ?? ''} onChange={(event) => setFilters((current) => ({ ...current, page: 1, from: event.target.value || undefined }))} /></label>
        <label><span className="mb-1.5 block text-xs font-bold text-muted">Đến ngày</span><input type="date" className={inputClass} value={filters.to?.slice(0, 10) ?? ''} onChange={(event) => setFilters((current) => ({ ...current, page: 1, to: event.target.value ? `${event.target.value}T23:59:59.999` : undefined }))} /></label>
      </div>
    </Card>

    <Card className="p-4 sm:p-6">
      <SectionHeading title="Lịch sử thay đổi" description={`${data.total.toLocaleString('vi-VN')} bản ghi${activeFilters ? ` · ${activeFilters} bộ lọc đang áp dụng` : ''}.`} actions={<Chip tone="neutral" dot>{query.isFetching ? 'Đang cập nhật' : 'Dữ liệu mới nhất'}</Chip>} />
      {data.items.length === 0 ? <EmptyState compact icon={<Funnel />} title="Không có nhật ký phù hợp" description="Thử thay đổi khoảng thời gian hoặc bỏ bớt bộ lọc." /> : <div className="overflow-x-auto"><table className="manager-table w-full min-w-[980px]"><thead><tr><th>Sự kiện</th><th>Đối tượng</th><th>Người thực hiện</th><th>Thời gian / IP</th><th><span className="sr-only">Chi tiết</span></th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><Chip tone={toneForAction(item.action)}>{labelAction(item.action)}</Chip><small className="mt-1.5 font-mono text-[10px] text-muted">{item.action}</small></td><td><strong>{labelEntity(item.entityType)}</strong><small>#{item.entityId}</small></td><td><strong>{item.actor?.displayName ?? 'Hệ thống tự động'}</strong><small>{item.actor?.email ?? 'Không có tài khoản thực hiện'}</small></td><td><span className="tabular-nums">{dateTime(item.createdAt)}</span><small>{item.ipAddress ? `IP ${item.ipAddress}` : 'Không ghi nhận IP'}</small></td><td><Button size="sm" variant="secondary" icon={<Eye />} onClick={() => setSelected(item)}>Chi tiết</Button></td></tr>)}</tbody></table></div>}
      <Pagination page={data.page} pageSize={data.limit} total={data.total} disabled={query.isFetching} onChange={(page) => setFilters((current) => ({ ...current, page }))} />
    </Card>
    <AuditDetailDialog item={selected} onClose={() => setSelected(null)} />
  </div>;
}

function AuditDetailDialog({ item, onClose }: { item: AuditLogItem | null; onClose: () => void }) {
  return <Dialog open={item !== null} onClose={onClose} size="lg" title="Chi tiết thay đổi" description={item ? `${labelAction(item.action)} · ${labelEntity(item.entityType)} #${item.entityId}` : undefined}>
    {item && <div className="space-y-5">
      <dl className="grid gap-3 rounded-card bg-canvas p-4 text-sm sm:grid-cols-2"><Meta label="Người thực hiện" value={item.actor ? `${item.actor.displayName} · ${item.actor.email}` : 'Hệ thống tự động'} /><Meta label="Thời gian" value={dateTime(item.createdAt)} /><Meta label="Mã sự kiện" value={item.action} mono /><Meta label="Địa chỉ IP" value={item.ipAddress ?? 'Không ghi nhận'} mono /></dl>
      <ChangeSet oldData={item.oldData} newData={item.newData} />
    </div>}
  </Dialog>;
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-xs font-bold text-muted">{label}</dt><dd className={`mt-1 break-all font-semibold text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd></div>; }
function displayValue(value: unknown) { if (value === null || value === undefined || value === '') return '—'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }
function ChangeSet({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const keys = [...new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])];
  if (keys.length === 0) return <EmptyState compact icon={<ShieldCheck />} title="Không có dữ liệu chi tiết" description="Sự kiện này chỉ ghi nhận thời điểm và người thực hiện." />;
  return <div><h3 className="mb-3 font-extrabold text-ink">Dữ liệu thay đổi</h3><div className="overflow-hidden rounded-card border border-line"><div className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1fr)_minmax(0,1fr)] bg-canvas px-4 py-2.5 text-xs font-bold text-muted"><span>Trường</span><span>Trước thay đổi</span><span>Sau thay đổi</span></div>{keys.map((key) => <div key={key} className="grid grid-cols-[minmax(120px,.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-t border-line px-4 py-3 text-sm"><code className="break-all text-xs font-bold text-primary-deep">{key}</code><span className="break-all text-muted">{displayValue(oldData?.[key])}</span><strong className="break-all font-semibold text-ink">{displayValue(newData?.[key])}</strong></div>)}</div></div>;
}
