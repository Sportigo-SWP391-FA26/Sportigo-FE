import { Funnel, X } from '@phosphor-icons/react';
import { useId, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { addDays, endOfCenterDay, formatDateTime, formatTime, monthRange, startOfCenterDay, todayInCenter } from '../format';
import { useAttendanceHistory } from '../hooks/useAttendance';
import { attendanceStatuses, attendanceStatusLabels } from '../labels';
import type { AttendanceHistoryItem, AttendanceQuery, AttendanceStatus } from '../types';
import { AttendanceStatusChip } from './AttendanceStatusChip';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Pagination } from './ui/Pagination';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from './ui/States';
import { cardClass, describedBy, inputClass } from './ui/styles';

export type AttendanceScope = 'member' | 'coach' | 'manager';

const PAGE_SIZE = 20;
const FILTER_KEYS = ['from', 'to', 'status', 'classId', 'memberId', 'page'] as const;

function presets(today: string) {
  const month = monthRange(today);
  return [
    { label: '7 ngày qua', from: addDays(today, -6), to: today },
    { label: '30 ngày qua', from: addDays(today, -29), to: today },
    { label: 'Tháng này', from: month.from, to: month.to },
  ];
}

/** FR-48 · Lịch sử điểm danh dùng chung cho Member, Coach và Center Manager */
export function AttendanceHistoryPanel({ scope }: { scope: AttendanceScope }) {
  const id = useId();
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const status = (attendanceStatuses as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as AttendanceStatus)
    : undefined;
  const classId = Number(params.get('classId')) || undefined;
  const memberId = scope === 'manager' ? Number(params.get('memberId')) || undefined : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const rangeError = from && to && from > to ? 'Đến ngày phải bằng hoặc sau Từ ngày.' : undefined;
  const isStaff = scope !== 'member';

  const query: AttendanceQuery = {
    page,
    pageSize: PAGE_SIZE,
    status,
    classId: isStaff ? classId : undefined,
    memberId,
    from: from ? startOfCenterDay(from) : undefined,
    to: to ? endOfCenterDay(to) : undefined,
  };
  const history = useAttendanceHistory(query, !rangeError);
  const hasFilters = FILTER_KEYS.some((key) => key !== 'page' && params.get(key));

  // Đổi bộ lọc thì quay về trang 1; giữ các tham số khác của trang (ví dụ ?tab=)
  const updateParams = (patch: Partial<Record<(typeof FILTER_KEYS)[number], string | undefined>>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  const clearFilters = () => updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])));
  const today = todayInCenter();
  const activeItems = history.data?.items ?? [];
  const className = activeItems.find((item) => item.class.id === classId)?.class.name;
  const memberName = activeItems.find((item) => item.member.id === memberId)?.member.displayName;

  return (
    <div>
      <div className={`${cardClass} p-4 sm:p-5`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <Field id={`${id}-from`} label="Từ ngày">
            <input id={`${id}-from`} type="date" className={inputClass} value={from} max={to || undefined} onChange={(event) => updateParams({ from: event.target.value })} />
          </Field>
          <Field id={`${id}-to`} label="Đến ngày" error={rangeError}>
            <input
              id={`${id}-to`}
              type="date"
              className={inputClass}
              value={to}
              min={from || undefined}
              aria-invalid={rangeError ? true : undefined}
              aria-describedby={describedBy(`${id}-to`, { error: rangeError })}
              onChange={(event) => updateParams({ to: event.target.value })}
            />
          </Field>
          <Field id={`${id}-status`} label="Trạng thái">
            <select id={`${id}-status`} className={inputClass} value={status ?? ''} onChange={(event) => updateParams({ status: event.target.value })}>
              <option value="">Tất cả trạng thái</option>
              {attendanceStatuses.map((value) => (
                <option key={value} value={value}>
                  {attendanceStatusLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters} icon={<X aria-hidden="true" />}>
            Xóa bộ lọc
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Chọn nhanh khoảng thời gian">
          {presets(today).map((preset) => {
            const active = preset.from === from && preset.to === to;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => updateParams({ from: preset.from, to: preset.to })}
                className={`min-h-9 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors ${
                  active ? 'border-primary bg-primary/10 text-primary-deep' : 'border-line bg-surface text-ink hover:border-primary/40'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          {isStaff && classId && (
            <ActiveFilter label={`Lớp: ${className ?? `#${classId}`}`} onRemove={() => updateParams({ classId: undefined })} />
          )}
          {memberId && (
            <ActiveFilter label={`Học viên: ${memberName ?? `#${memberId}`}`} onRemove={() => updateParams({ memberId: undefined })} />
          )}
        </div>

        {isStaff && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Funnel className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Bộ chọn danh sách {scope === 'manager' ? 'lớp và hội viên' : 'lớp'} chưa sẵn sàng (cần API{' '}
              {scope === 'manager' ? 'GET /api/group-classes, GET /api/users' : 'GET /api/coaches/me/sessions'}). Tạm thời bấm vào tên{' '}
              {scope === 'manager' ? 'lớp hoặc học viên' : 'lớp'} trong bảng để lọc.
            </span>
          </p>
        )}
      </div>

      <div className="mt-4">
        {rangeError ? (
          <InlineAlert tone="warning">{rangeError}</InlineAlert>
        ) : history.isPending ? (
          <ListSkeleton rows={5} label="Đang tải lịch sử điểm danh…" />
        ) : history.error ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isRefetching} />
        ) : !history.data || activeItems.length === 0 ? (
          <EmptyState
            title="Không có buổi điểm danh phù hợp"
            description={
              hasFilters
                ? 'Thử nới rộng khoảng thời gian hoặc bỏ bớt bộ lọc.'
                : scope === 'member'
                  ? 'Lịch sử sẽ xuất hiện sau khi Coach điểm danh các buổi lớp nhóm của bạn.'
                  : 'Chưa có buổi học nào được điểm danh.'
            }
            action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Xóa bộ lọc</Button> : undefined}
          />
        ) : (
          <div aria-busy={history.isFetching} className={`transition-opacity ${history.isPlaceholderData ? 'opacity-60' : ''}`}>
            <HistoryTable
              items={activeItems}
              scope={scope}
              onFilterClass={(value) => updateParams({ classId: String(value) })}
              onFilterMember={(value) => updateParams({ memberId: String(value) })}
            />
            <HistoryCards
              items={activeItems}
              scope={scope}
              onFilterClass={(value) => updateParams({ classId: String(value) })}
              onFilterMember={(value) => updateParams({ memberId: String(value) })}
            />
            <Pagination
              page={history.data.page}
              pageSize={history.data.pageSize}
              total={history.data.total}
              disabled={history.isFetching}
              onChange={(next) => updateParams({ page: String(next) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveFilter({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary/10 pr-1 pl-3.5 text-[13px] font-bold whitespace-nowrap text-primary-deep">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Bỏ lọc ${label}`} className="grid size-7 place-items-center rounded-full hover:bg-primary/15">
        <X aria-hidden="true" />
      </button>
    </span>
  );
}

type RowProps = {
  items: AttendanceHistoryItem[];
  scope: AttendanceScope;
  onFilterClass: (classId: number) => void;
  onFilterMember: (memberId: number) => void;
};

function SessionTime({ item, scope }: { item: AttendanceHistoryItem; scope: AttendanceScope }) {
  const text = `${formatDateTime(item.session.startsAt)} – ${formatTime(item.session.endsAt)}`;
  if (scope !== 'coach') return <span className="font-bold text-ink">{text}</span>;
  return (
    <Link to={`/coach/sessions/${item.session.id}/attendance`} className="font-bold text-primary-deep hover:underline">
      {text}
    </Link>
  );
}

function FilterButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="text-left font-bold text-ink underline-offset-2 hover:text-primary-deep hover:underline">
      {children}
    </button>
  );
}

function ClassCell({ item, scope, onFilterClass }: { item: AttendanceHistoryItem; scope: AttendanceScope; onFilterClass: (id: number) => void }) {
  return (
    <>
      {scope === 'member' ? (
        <span className="font-bold text-ink">{item.class.name}</span>
      ) : (
        <FilterButton onClick={() => onFilterClass(item.class.id)} label={`Lọc theo lớp ${item.class.name}`}>
          {item.class.name}
        </FilterButton>
      )}
      <span className="block text-xs text-muted">{item.class.sport.name}</span>
    </>
  );
}

function MemberCell({ item, scope, onFilterMember }: { item: AttendanceHistoryItem; scope: AttendanceScope; onFilterMember: (id: number) => void }) {
  return (
    <>
      {scope === 'manager' ? (
        <FilterButton onClick={() => onFilterMember(item.member.id)} label={`Lọc theo học viên ${item.member.displayName}`}>
          {item.member.displayName}
        </FilterButton>
      ) : (
        <span className="font-bold text-ink">{item.member.displayName}</span>
      )}
      <span className="block text-xs text-muted">{item.member.memberCode}</span>
    </>
  );
}

function HistoryTable({ items, scope, onFilterClass, onFilterMember }: RowProps) {
  const isStaff = scope !== 'member';
  return (
    <div className={`${cardClass} hidden overflow-hidden md:block`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas text-xs font-bold tracking-[.04em] text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Buổi học</th>
            <th scope="col" className="px-4 py-3">Lớp</th>
            {isStaff && <th scope="col" className="px-4 py-3">Học viên</th>}
            <th scope="col" className="px-4 py-3">Trạng thái</th>
            <th scope="col" className="px-4 py-3">Ghi chú</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr key={item.id} className="align-middle hover:bg-canvas/70">
              <td className="px-4 py-3 whitespace-nowrap">
                <SessionTime item={item} scope={scope} />
              </td>
              <td className="px-4 py-3">
                <ClassCell item={item} scope={scope} onFilterClass={onFilterClass} />
              </td>
              {isStaff && (
                <td className="px-4 py-3">
                  <MemberCell item={item} scope={scope} onFilterMember={onFilterMember} />
                </td>
              )}
              <td className="px-4 py-3">
                <AttendanceStatusChip status={item.status} />
              </td>
              <td className="max-w-64 px-4 py-3 text-[13px] text-muted">{item.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryCards({ items, scope, onFilterClass, onFilterMember }: RowProps) {
  return (
    <ul className="space-y-2.5 md:hidden">
      {items.map((item) => (
        <li key={item.id} className={`${cardClass} p-4 text-sm`}>
          <div className="flex items-start justify-between gap-3">
            <SessionTime item={item} scope={scope} />
            <AttendanceStatusChip status={item.status} />
          </div>
          <div className="mt-2 grid gap-2">
            <div>
              <ClassCell item={item} scope={scope} onFilterClass={onFilterClass} />
            </div>
            {scope !== 'member' && (
              <div>
                <MemberCell item={item} scope={scope} onFilterMember={onFilterMember} />
              </div>
            )}
          </div>
          {item.note && <p className="mt-2 text-[13px] text-muted">Ghi chú: {item.note}</p>}
        </li>
      ))}
    </ul>
  );
}
