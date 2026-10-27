import { ChatCircleDots, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../training/components/ui/Button';
import { PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Pagination } from '../../training/components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { formatDateTime } from '../../training/format';
import { NewSupportRequestDialog } from '../components/NewSupportRequestDialog';
import { useSupportList } from '../hooks/useSupport';
import { categoryLabel, priorityOption, statusOption, statusOptions } from '../labels';
import type { SupportStatus } from '../types';

const PAGE_SIZE = 10;
const isStatus = (value: string | null): value is SupportStatus => statusOptions.some((option) => option.value === value);

// FR-55 · /member/support: danh sách yêu cầu hỗ trợ của Member
export function MemberSupportPage() {
  const [params, setParams] = useSearchParams();
  const status = isStatus(params.get('status')) ? (params.get('status') as SupportStatus) : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [creating, setCreating] = useState(false);
  const list = useSupportList({ status, page, pageSize: PAGE_SIZE });
  const items = list.data?.items ?? [];

  const update = (next: { status?: string; page?: string }) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!('page' in next)) merged.delete('page');
    setParams(merged, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <PageHeader
        eyebrow="Hỗ trợ"
        title="Yêu cầu hỗ trợ"
        description="Gửi thắc mắc về tài khoản, thanh toán, lớp học… và theo dõi phản hồi của trung tâm."
        actions={
          <Button icon={<Plus aria-hidden="true" />} onClick={() => setCreating(true)}>
            Gửi yêu cầu
          </Button>
        }
      />

      <label className="mb-4 block max-w-xs">
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

      {list.isPending ? (
        <ListSkeleton rows={4} label="Đang tải yêu cầu hỗ trợ…" />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} pendingApi="GET /api/support-requests" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ChatCircleDots />}
          title={status ? 'Không có yêu cầu ở trạng thái này' : 'Bạn chưa gửi yêu cầu nào'}
          description="Bấm “Gửi yêu cầu” khi cần trung tâm hỗ trợ."
        />
      ) : (
        <>
          <ul className={`space-y-3 transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={list.isFetching}>
            {items.map((item) => {
              const state = statusOption(item.status);
              const priority = priorityOption(item.priority);
              return (
                <li key={item.id}>
                  <Link
                    to={`/member/support/${item.id}`}
                    className="block rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={state.tone} dot>
                        {state.label}
                      </Chip>
                      <Chip tone={priority.tone}>{priority.label}</Chip>
                      <span className="text-xs text-muted">{categoryLabel(item.category)}</span>
                    </div>
                    <p className="mt-2 font-bold text-ink">{item.subject}</p>
                    <p className="mt-1 text-xs text-muted">
                      #{item.id} · Gửi lúc {formatDateTime(item.createdAt)} · {item.messageCount} tin nhắn
                      {item.assignee ? ` · Phụ trách: ${item.assignee.displayName}` : ''}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            disabled={list.isFetching}
            onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
          />
        </>
      )}

      <NewSupportRequestDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
