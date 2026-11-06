import { CalendarCheck, ChalkboardTeacher, Coins, Headset, UserPlus } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ButtonLink } from '../../../components/ui/Button';
import { Card, PageHeader, StatTile } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, tabPanelProps } from '../../../components/ui/styles';
import { Tabs } from '../../../components/ui/Tabs';
import { addDays, formatDate, formatNumber, formatPercent, monthRange, todayInCenter } from '../../training/format';
import { statusLabel, statusTone } from '../../users/labels';
import { useStaffPerformance } from '../hooks/useStaff';
import type { CoachPerformance, PerformanceRange, ReceptionistPerformance } from '../performanceTypes';

// note: định dạng tiền VND cho cột tiền thu tại quầy
const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TAB_PREFIX = 'staff-performance';
type Tab = 'coach' | 'receptionist';

// note: các khoảng chọn nhanh; mọi mốc tính theo ngày giờ trung tâm (Việt Nam)
function presetRange(preset: string, today: string): PerformanceRange {
  if (preset === 'last-month') return monthRange(addDays(`${today.slice(0, 8)}01`, -1));
  if (preset === 'last-30') return { from: addDays(today, -29), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

// note: đọc khoảng ngày từ URL (để F5 hoặc gửi link vẫn giữ); thiếu/sai thì dùng "tháng này"
function readRange(params: URLSearchParams, today: string): PerformanceRange {
  const from = params.get('from');
  const to = params.get('to');
  return from && to && DATE.test(from) && DATE.test(to) && from <= to ? { from, to } : presetRange('this-month', today);
}

type SortState<K extends string> = { key: K; desc: boolean };

// note: tiêu đề cột bấm được để sắp xếp; aria-sort cho trình đọc màn hình biết cột đang sắp
function SortHeader<K extends string>({ label, column, sort, onSort, hint }: { label: string; column: K; sort: SortState<K>; onSort: (key: K) => void; hint?: string }) {
  const active = sort.key === column;
  return (
    <th scope="col" className="px-4 py-3 text-right" aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="inline-flex items-center gap-1 font-bold uppercase hover:text-ink" onClick={() => onSort(column)} title={hint}>
        {label}
        <span aria-hidden="true">{active ? (sort.desc ? '↓' : '↑') : '↕'}</span>
      </button>
    </th>
  );
}

function useSort<K extends string>(initial: K) {
  const [sort, setSort] = useState<SortState<K>>({ key: initial, desc: true });
  // note: bấm lại cùng cột thì đảo chiều, bấm cột khác thì sắp giảm dần (người làm nhiều lên đầu)
  const onSort = (key: K) => setSort((current) => (current.key === key ? { key, desc: !current.desc } : { key, desc: true }));
  return { sort, onSort };
}

function sortBy<T, K extends string>(items: T[], sort: SortState<K>, value: (item: T, key: K) => number | null) {
  // note: giá trị null (chưa có dữ liệu) luôn nằm cuối dù sắp chiều nào
  return [...items].sort((a, b) => {
    const left = value(a, sort.key);
    const right = value(b, sort.key);
    if (left === null) return 1;
    if (right === null) return -1;
    return sort.desc ? right - left : left - right;
  });
}

function PersonCell({ name, code, status }: { name: string; code: string | null; status: CoachPerformance['accountStatus'] }) {
  return (
    <td className="px-4 py-3">
      <p className="font-bold text-ink">{name}</p>
      <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        {code ?? '—'}
        {/* note: chỉ gắn nhãn khi tài khoản không hoạt động để người xem hiểu vì sao số liệu thấp */}
        {status !== 'ACTIVE' && <Chip tone={statusTone(status)}>{statusLabel(status)}</Chip>}
      </p>
    </td>
  );
}

const Num = ({ children }: { children: ReactNode }) => <td className="px-4 py-3 text-right tabular-nums text-ink">{children}</td>;

type CoachKey = 'groupSessionsHeld' | 'privateSessions' | 'attendanceRate' | 'assessments' | 'activeTrainees';

function CoachTable({ coaches }: { coaches: CoachPerformance[] }) {
  const { sort, onSort } = useSort<CoachKey>('groupSessionsHeld');
  const rows = sortBy(coaches, sort, (coach, key) => coach[key]);
  if (coaches.length === 0) return <EmptyState icon={<ChalkboardTeacher />} title="Chưa có Coach" description="Thêm Coach ở trang Nhân sự." />;
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs font-bold tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Coach</th>
            <SortHeader label="Buổi lớp nhóm" column="groupSessionsHeld" sort={sort} onSort={onSort} hint="Đã điểm danh / đã diễn ra" />
            <SortHeader label="Buổi 1-1" column="privateSessions" sort={sort} onSort={onSort} />
            <SortHeader label="Tỷ lệ có mặt" column="attendanceRate" sort={sort} onSort={onSort} hint="Có mặt + đi muộn trên tổng lượt điểm danh" />
            <SortHeader label="Đánh giá" column="assessments" sort={sort} onSort={onSort} />
            <SortHeader label="Học viên" column="activeTrainees" sort={sort} onSort={onSort} hint="Đang phụ trách tại thời điểm hiện tại" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((coach) => {
            const missing = coach.groupSessionsHeld - coach.groupSessionsMarked;
            return (
              <tr key={coach.id}>
                <PersonCell name={coach.displayName} code={coach.staffCode} status={coach.accountStatus} />
                <Num>
                  {coach.groupSessionsMarked}/{coach.groupSessionsHeld}
                  {/* note: nhắc Manager khi Coach còn buổi đã dạy mà chưa điểm danh */}
                  {missing > 0 && (
                    <span className="mt-1 block">
                      <Chip tone="warning">Chưa điểm danh {missing}</Chip>
                    </span>
                  )}
                </Num>
                <Num>{coach.privateSessions}</Num>
                <Num>{coach.attendanceRate === null ? '—' : formatPercent(coach.attendanceRate)}</Num>
                <Num>{coach.assessments}</Num>
                <Num>{coach.activeTrainees}</Num>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ReceptionistKey = 'supportResolved' | 'supportInProgress' | 'avgResolutionHours' | 'cashCollected' | 'membersCreated';

function ReceptionistTable({ receptionists }: { receptionists: ReceptionistPerformance[] }) {
  const { sort, onSort } = useSort<ReceptionistKey>('supportResolved');
  const rows = sortBy(receptionists, sort, (receptionist, key) => receptionist[key]);
  if (receptionists.length === 0) return <EmptyState icon={<Headset />} title="Chưa có lễ tân" description="Thêm Receptionist ở trang Nhân sự." />;
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs font-bold tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Lễ tân</th>
            <SortHeader label="Hỗ trợ đã xong" column="supportResolved" sort={sort} onSort={onSort} />
            <SortHeader label="Đang giữ" column="supportInProgress" sort={sort} onSort={onSort} hint="Yêu cầu đang phụ trách, chưa giải quyết" />
            <SortHeader label="TG xử lý TB" column="avgResolutionHours" sort={sort} onSort={onSort} hint="Từ lúc hội viên gửi tới lúc giải quyết" />
            <SortHeader label="Thu tại quầy" column="cashCollected" sort={sort} onSort={onSort} />
            <SortHeader label="Hội viên mới" column="membersCreated" sort={sort} onSort={onSort} hint="Tạo tại quầy" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((receptionist) => (
            <tr key={receptionist.id}>
              <PersonCell name={receptionist.displayName} code={receptionist.staffCode} status={receptionist.accountStatus} />
              <Num>{receptionist.supportResolved}</Num>
              <Num>{receptionist.supportInProgress}</Num>
              <Num>{receptionist.avgResolutionHours === null ? '—' : `${formatNumber(receptionist.avgResolutionHours)} giờ`}</Num>
              <Num>
                {vnd.format(receptionist.cashCollected)}
                <span className="block text-xs text-muted">{receptionist.cashPayments} giao dịch</span>
              </Num>
              <Num>{receptionist.membersCreated}</Num>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// FR-65 · /app/staff/performance: Center Manager xem hiệu suất Coach và Lễ tân theo khoảng ngày
export function StaffPerformancePage() {
  const today = todayInCenter();
  const [params, setParams] = useSearchParams();
  const range = readRange(params, today);
  const [tab, setTab] = useState<Tab>('coach');
  // note: lỗi nhập khoảng ngày sai; khi sai giữ nguyên khoảng cũ, không gọi API
  const [rangeError, setRangeError] = useState<string | null>(null);
  const performance = useStaffPerformance(range);

  const applyRange = (next: PerformanceRange) => {
    if (!DATE.test(next.from) || !DATE.test(next.to)) return;
    if (next.from > next.to) {
      setRangeError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    setRangeError(null);
    setParams({ from: next.from, to: next.to }, { replace: true });
  };

  const data = performance.data;
  const tabs = [
    { value: 'coach' as const, label: `Coach (${data?.coaches.length ?? 0})` },
    { value: 'receptionist' as const, label: `Lễ tân (${data?.receptionists.length ?? 0})` },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Nhân sự"
        title="Hiệu suất nhân sự"
        description={`Số liệu từ ${formatDate(range.from)} đến ${formatDate(range.to)}. Học viên và yêu cầu đang giữ tính tại thời điểm hiện tại.`}
        actions={
          <ButtonLink to="/app/staff" variant="secondary">
            Danh sách nhân sự
          </ButtonLink>
        }
      />

      <Card className="mb-5 grid gap-3 p-3 sm:grid-cols-[200px_1fr_1fr] sm:items-end sm:p-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">Khoảng thời gian</span>
          <select className={inputClass} defaultValue="" onChange={(event) => event.target.value && applyRange(presetRange(event.target.value, today))}>
            <option value="">Chọn nhanh…</option>
            <option value="this-month">Tháng này</option>
            <option value="last-month">Tháng trước</option>
            <option value="last-30">30 ngày qua</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">Từ ngày</span>
          <input type="date" className={inputClass} value={range.from} max={today} onChange={(event) => applyRange({ from: event.target.value, to: range.to })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">Đến ngày</span>
          <input type="date" className={inputClass} value={range.to} max={today} onChange={(event) => applyRange({ from: range.from, to: event.target.value })} />
        </label>
        {rangeError && (
          <div className="sm:col-span-3">
            <InlineAlert>{rangeError}</InlineAlert>
          </div>
        )}
      </Card>

      {performance.isError ? (
        <ErrorState error={performance.error} onRetry={() => performance.refetch()} retrying={performance.isRefetching} pendingApi="GET /api/staff/performance" />
      ) : !data ? (
        // note: kiểm tra !data (thay vì isPending) để TypeScript biết bên dưới data chắc chắn có giá trị
        <ListSkeleton rows={5} label="Đang tính hiệu suất nhân sự…" />
      ) : (
        <div className={`space-y-5 transition-opacity ${performance.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={performance.isFetching}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Buổi lớp nhóm đã dạy" value={formatNumber(data.totals.groupSessionsHeld)} icon={<CalendarCheck />} />
            <StatTile label="Buổi 1-1 đã dạy" value={formatNumber(data.totals.privateSessions)} icon={<ChalkboardTeacher />} tone="sky" />
            <StatTile label="Yêu cầu hỗ trợ đã xong" value={formatNumber(data.totals.supportResolved)} icon={<Headset />} tone="lime" />
            <StatTile label="Tiền thu tại quầy" value={vnd.format(data.totals.cashCollected)} icon={<Coins />} tone="energy" />
            <StatTile label="Hội viên tạo tại quầy" value={formatNumber(data.totals.membersCreated)} icon={<UserPlus />} />
          </div>

          <Tabs label="Nhóm nhân sự" idPrefix={TAB_PREFIX} tabs={tabs} value={tab} onChange={setTab} />
          <div {...tabPanelProps(TAB_PREFIX, tab)}>
            {tab === 'coach' ? <CoachTable coaches={data.coaches} /> : <ReceptionistTable receptionists={data.receptionists} />}
          </div>
        </div>
      )}
    </div>
  );
}
