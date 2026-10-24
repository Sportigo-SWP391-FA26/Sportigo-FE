import { ChatCircleDots, MagnifyingGlass } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Pagination } from '../../training/components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { formatDateTime } from '../../training/format';
import { useDebouncedValue } from '../../training/hooks/useDebouncedValue';
import { useSupportQueue } from '../hooks/useSupportStaff';
import { categoryLabel, priorityOption, priorityOptions, statusOption, statusOptions } from '../labels';
import type { SupportPriority, SupportStatus } from '../types';

const PAGE_SIZE = 20;
const isStatus = (value: string | null): value is SupportStatus => statusOptions.some((option) => option.value === value);
const isPriority = (value: string | null): value is SupportPriority => priorityOptions.some((option) => option.value === value);

// FR-56 · /app/support: hàng đợi yêu cầu hỗ trợ cho Receptionist và Manager
export function SupportQueuePage() {
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const [params, setParams] = useSearchParams();
  const status = isStatus(params.get('status')) ? (params.get('status') as SupportStatus) : undefined;
  const priority = isPriority(params.get('priority')) ? (params.get('priority') as SupportPriority) : undefined;
  const mine = params.get('mine') === 'true';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const update = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!('page' in next)) merged.delete('page');
    setParams(merged, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedSearch) update({ q: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ khi từ khóa đã debounce thay đổi
  }, [debouncedSearch]);

  const queue = useSupportQueue({ status, priority, mine: mine || undefined, q: debouncedSearch || undefined, page, pageSize: PAGE_SIZE });
  const items = queue.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Hỗ trợ"
        title="Yêu cầu hỗ trợ"
        description={
          isManager
            ? 'Theo dõi mọi yêu cầu của hội viên, giao việc cho lễ tân và giám sát tiến độ.'
            : 'Yêu cầu chưa có người nhận và yêu cầu bạn đang phụ trách.'
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px_auto] sm:items-center">
        <label className="relative block">
          <span className="sr-only">Tìm yêu cầu</span>
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Chủ đề hoặc tên hội viên"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select className={inputClass} value={status ?? ''} onChange={(event) => update({ status: event.target.value || undefined })}>
            <option value="">Tất cả trạng thái</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Lọc theo mức ưu tiên</span>
          <select className={inputClass} value={priority ?? ''} onChange={(event) => update({ priority: event.target.value || undefined })}>
            <option value="">Mọi mức ưu tiên</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" className="size-4 accent-primary" checked={mine} onChange={(event) => update({ mine: event.target.checked ? 'true' : undefined })} />
          Của tôi
        </label>
      </div>

      {queue.isPending ? (
        <ListSkeleton rows={5} label="Đang tải hàng đợi…" />
      ) : queue.isError ? (
        <ErrorState error={queue.error} onRetry={() => queue.refetch()} retrying={queue.isRefetching} pendingApi="GET /api/support-requests" />
      ) : items.length === 0 ? (
        <EmptyState icon={<ChatCircleDots />} title="Không có yêu cầu phù hợp" description="Hàng đợi trống hoặc bộ lọc quá hẹp." />
      ) : (
        <div className={`transition-opacity ${queue.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={queue.isFetching}>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-bold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Yêu cầu</th>
                  <th scope="col" className="px-4 py-3">Hội viên</th>
                  <th scope="col" className="px-4 py-3">Ưu tiên</th>
                  <th scope="col" className="px-4 py-3">Trạng thái</th>
                  <th scope="col" className="px-4 py-3">Phụ trách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => {
                  const state = statusOption(item.status);
                  const level = priorityOption(item.priority);
                  return (
                    <tr key={item.id} className="align-middle">
                      <td className="px-4 py-3">
                        <Link to={`/app/support/${item.id}`} className="font-bold text-ink hover:text-primary hover:underline">
                          {item.subject}
                        </Link>
                        <p className="text-xs text-muted">
                          #{item.id} · {categoryLabel(item.category)} · {formatDateTime(item.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink">{item.requester.displayName}</td>
                      <td className="px-4 py-3">
                        <Chip tone={level.tone}>{level.label}</Chip>
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={state.tone} dot>
                          {state.label}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 text-ink">{item.assignee?.displayName ?? <span className="text-muted">Chưa có</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={queue.data.page}
            pageSize={queue.data.pageSize}
            total={queue.data.total}
            disabled={queue.isFetching}
            onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
          />
        </div>
      )}
    </div>
  );
}
