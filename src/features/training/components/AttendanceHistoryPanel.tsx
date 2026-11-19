import { FileXls, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../errors';
import { addDays, endOfCenterDay, formatDateTime, formatTime, monthRange, startOfCenterDay, todayInCenter } from '../format';
import { useAttendanceHistory, useExportAttendance } from '../hooks/useAttendance';
import { attendanceStatuses, attendanceStatusLabels } from '../labels';
import type { AttendanceHistoryItem, AttendanceQuery, AttendanceStatus } from '../types';
import { AttendanceStatusChip } from './AttendanceStatusChip';
import { SelectInput } from './SelectInput';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Pagination } from '../../../components/ui/Pagination';
import { DateInput } from '../../../components/ui/LocalizedInputs';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { cardClass, describedBy, inputClass } from '../../../components/ui/styles';

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

// Bỏ dấu tiếng Việt để tìm "binh" vẫn ra "Bình"
function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function matchesSearch(item: AttendanceHistoryItem, keyword: string) {
  const haystack = [item.class.name, item.class.sport.name, item.member.displayName, item.member.memberCode, item.note]
    .filter(Boolean)
    .join(' ');
  return normalize(haystack).includes(keyword);
}

/** FR-48 · Lịch sử điểm danh dùng chung cho Member, Coach và Center Manager */
export function AttendanceHistoryPanel({ scope }: { scope: AttendanceScope }) {
  const id = useId();
  const [search, setSearch] = useState('');
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  }, [params]);
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
  const exporter = useExportAttendance();
  const canExport = isStaff && !rangeError && (history.data?.total ?? 0) > 0;

  // Xuất đúng bộ lọc đang áp dụng trên server; ô tìm kiếm chỉ lọc trong trang nên không áp dụng cho file
  const exportExcel = async () => {
    try {
      const filters = { status: query.status, classId: query.classId, memberId: query.memberId, from: query.from, to: query.to };
      saveFile(await exporter.mutateAsync(filters), `sportigo-diem-danh-${todayInCenter()}.xlsx`);
      toast('Đã tải báo cáo điểm danh.');
    } catch (error) {
      toast(parseApiError(error).message, 'error');
    }
  };
  const hasFilters = FILTER_KEYS.some((key) => key !== 'page' && params.get(key));

  // Đổi bộ lọc thì quay về trang 1; giữ các tham số khác của trang (ví dụ ?tab=)
  const updateParams = (patch: Partial<Record<(typeof FILTER_KEYS)[number], string | undefined>>) => {
    const next = new URLSearchParams(latestParams.current);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.delete('page');
    latestParams.current = next;
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch('');
    updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])));
  };
  const today = todayInCenter();
  const activeItems = history.data?.items ?? [];
  // API lịch sử điểm danh chưa có tham số tìm kiếm nên chỉ lọc trong trang đang xem
  const keyword = normalize(search.trim());
  const visibleItems = keyword ? activeItems.filter((item) => matchesSearch(item, keyword)) : activeItems;
  const className = activeItems.find((item) => item.class.id === classId)?.class.name;
  const memberName = activeItems.find((item) => item.member.id === memberId)?.member.displayName;

  const presetGroup = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn nhanh khoảng thời gian">
      {presets(today).map((preset) => {
        const active = preset.from === from && preset.to === to;
        return (
          <button
            key={preset.label}
            type="button"
            aria-pressed={active}
            onClick={() => updateParams({ from: preset.from, to: preset.to })}
            className={`min-h-11 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors ${
              active ? 'border-primary bg-primary/10 text-primary-deep' : 'border-line bg-surface text-ink hover:border-primary/40'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );

  const clearButton = (
    <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters && !search} icon={<X aria-hidden="true" />}>
      Xóa bộ lọc
    </Button>
  );

  return (
    <div>
      <div className={`${cardClass} p-4 sm:p-5`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <Field id={`${id}-search`} label="Tìm kiếm" className="sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id={`${id}-search`}
                type="search"
                className={`${inputClass} pl-9`}
                value={search}
                placeholder={isStaff ? 'Lớp, học viên, ghi chú (trang này)' : 'Lớp, ghi chú (trang này)'}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </Field>
          <Field id={`${id}-from`} label="Từ ngày">
            <DateInput id={`${id}-from`} className={inputClass} value={from} onValueChange={(value) => updateParams({ from: value })} />
          </Field>
          <Field id={`${id}-to`} label="Đến ngày" error={rangeError}>
            <DateInput
              id={`${id}-to`}
              className={inputClass}
              value={to}
              aria-invalid={rangeError ? true : undefined}
              aria-describedby={describedBy(`${id}-to`, { error: rangeError })}
              onValueChange={(value) => updateParams({ to: value })}
            />
          </Field>
          <Field id={`${id}-status`} label="Trạng thái">
            <SelectInput id={`${id}-status`} value={status ?? ''} onChange={(event) => updateParams({ status: event.target.value })}>
              <option value="">Tất cả trạng thái</option>
              {attendanceStatuses.map((value) => (
                <option key={value} value={value}>
                  {attendanceStatusLabels[value]}
                </option>
              ))}
            </SelectInput>
          </Field>
          {clearButton}
        </div>
      </div>

      {/* Thẻ ngang: chip chọn nhanh và bộ lọc đang áp dụng bên trái, Xuất Excel bên phải */}
      <div className={`${cardClass} mt-3 flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4`}>
        <div className="flex flex-wrap items-center gap-2">
          {presetGroup}
          {isStaff && classId && (
            <ActiveFilter label={`Lớp: ${className ?? `#${classId}`}`} onRemove={() => updateParams({ classId: undefined })} />
          )}
          {memberId && (
            <ActiveFilter label={`Học viên: ${memberName ?? `#${memberId}`}`} onRemove={() => updateParams({ memberId: undefined })} />
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isStaff && (
            <Button
              variant="secondary"
              onClick={exportExcel}
              loading={exporter.isPending}
              disabled={!canExport}
              icon={<FileXls aria-hidden="true" />}
              title={search ? 'File xuất theo bộ lọc ngày, trạng thái, lớp; không áp dụng ô tìm kiếm' : undefined}
            >
              Xuất Excel
            </Button>
          )}
        </div>
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
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="Không tìm thấy kết quả"
            description={`Không có dòng nào khớp "${search.trim()}" trong trang này.`}
            action={<Button variant="secondary" onClick={() => setSearch('')}>Xóa tìm kiếm</Button>}
          />
        ) : (
          <div aria-busy={history.isFetching} className={`transition-opacity ${history.isPlaceholderData ? 'opacity-60' : ''}`}>
            <HistoryTable
              items={visibleItems}
              scope={scope}
              onFilterClass={(value) => updateParams({ classId: String(value) })}
              onFilterMember={(value) => updateParams({ memberId: String(value) })}
            />
            <HistoryCards
              items={visibleItems}
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

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Đợi trình duyệt bắt đầu tải rồi mới thu hồi URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
