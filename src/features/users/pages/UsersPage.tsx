import { MagnifyingGlass, UserPlus, UsersThree } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSessionRole, type AppRole } from '../../../components/auth/session';
import { PageHeader } from '../../training/components/ui/Card';
import { Pagination } from '../../training/components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { useDebouncedValue } from '../../training/hooks/useDebouncedValue';
import { Button } from '../../training/components/ui/Button';
import { CreateMemberDialog } from '../components/CreateMemberDialog';
import { UserStatusDialog } from '../components/UserStatusDialog';
import { UserTable } from '../components/UserTable';
import { useUserList } from '../hooks/useUsers';
import { roleOptions, statusOptions } from '../labels';
import type { UserStatus, UserSummary } from '../types';

const PAGE_SIZE = 20;

const isRole = (value: string | null): value is AppRole => roleOptions.some((option) => option.value === value);
const isStatus = (value: string | null): value is UserStatus => statusOptions.some((option) => option.value === value);

// FR-09 · /app/users: Manager tra cứu mọi người dùng; Receptionist chỉ tra cứu hội viên
export function UsersPage() {
  const isManager = getSessionRole() === 'CENTER_MANAGER';
  const [params, setParams] = useSearchParams();
  // note: bộ lọc lưu trên URL để F5 hoặc gửi link vẫn giữ nguyên kết quả
  const role = isManager && isRole(params.get('role')) ? (params.get('role') as AppRole) : undefined;
  const status = isStatus(params.get('status')) ? (params.get('status') as UserStatus) : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [search, setSearch] = useState(params.get('q') ?? '');
  // FR-06: người đang được khóa/mở khóa (null = hộp thoại đóng)
  const [statusTarget, setStatusTarget] = useState<UserSummary | null>(null);
  const [creating, setCreating] = useState(false);
  // note: chờ người dùng ngừng gõ 300ms mới gọi API, tránh gửi request theo từng phím
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const update = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    // note: đổi bộ lọc thì quay về trang 1, trừ khi chính là thao tác chuyển trang
    if (!('page' in next)) merged.delete('page');
    setParams(merged, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedSearch) update({ q: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ khi từ khóa đã debounce thay đổi
  }, [debouncedSearch]);

  const users = useUserList({ q: debouncedSearch || undefined, role, status, page, pageSize: PAGE_SIZE });
  const items = users.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Người dùng"
        title={isManager ? 'Quản lý người dùng' : 'Tra cứu hội viên'}
        description={
          isManager
            ? 'Tìm theo tên, email, số điện thoại hoặc mã; lọc theo vai trò và trạng thái.'
            : 'Tìm hội viên theo tên, email, số điện thoại hoặc mã hội viên.'
        }
        actions={
          // FR-08: tạo hội viên tại quầy (Receptionist và Manager)
          <Button icon={<UserPlus aria-hidden="true" />} onClick={() => setCreating(true)}>
            Tạo hội viên
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
        <label className="relative block">
          <span className="sr-only">Tìm kiếm người dùng</span>
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Tên, email, số điện thoại hoặc mã"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {isManager && (
          <label className="block">
            <span className="sr-only">Lọc theo vai trò</span>
            <select className={inputClass} value={role ?? ''} onChange={(event) => update({ role: event.target.value || undefined })}>
              <option value="">Tất cả vai trò</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
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
      </div>

      {users.isPending ? (
        <ListSkeleton rows={5} label="Đang tải danh sách người dùng…" />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} retrying={users.isRefetching} pendingApi="GET /api/users" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UsersThree />}
          title="Không tìm thấy người dùng"
          description="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
        />
      ) : (
        <div className={`transition-opacity ${users.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={users.isFetching}>
          <UserTable
            users={items}
            renderActions={
              isManager
                ? (user) =>
                    // note: backend không cho khóa Manager (kể cả chính mình) nên ẩn nút ở các dòng đó
                    user.role === 'CENTER_MANAGER' ? null : (
                      <Button
                        size="sm"
                        variant={user.status === 'LOCKED' ? 'secondary' : 'ghost'}
                        onClick={() => setStatusTarget(user)}
                        aria-label={`${user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'} ${user.displayName}`}
                      >
                        {user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                      </Button>
                    )
                : undefined
            }
          />
          <Pagination
            page={users.data.page}
            pageSize={users.data.pageSize}
            total={users.data.total}
            disabled={users.isFetching}
            onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
          />
        </div>
      )}

      {isManager && <UserStatusDialog user={statusTarget} onClose={() => setStatusTarget(null)} />}
      <CreateMemberDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
