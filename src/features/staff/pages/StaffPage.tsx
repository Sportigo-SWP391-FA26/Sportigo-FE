import { IdentificationBadge, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../training/components/ui/Button';
import { PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Pagination } from '../../training/components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { useDebouncedValue } from '../../training/hooks/useDebouncedValue';
import { UserStatusDialog } from '../../users/components/UserStatusDialog';
import { statusLabel, statusTone } from '../../users/labels';
import type { UserSummary } from '../../users/types';
import { StaffFormDialog } from '../components/StaffFormDialog';
import { useStaffList } from '../hooks/useStaff';
import { coachStatusOption, staffRoleLabel, staffRoleOptions } from '../labels';
import type { StaffMember, StaffRole } from '../types';

const PAGE_SIZE = 20;

const isStaffRole = (value: string | null): value is StaffRole => staffRoleOptions.some((option) => option.value === value);

// note: UserStatusDialog (FR-06) nhận UserSummary nên đổi shape tại đây thay vì viết lại hộp thoại khóa
const toUserSummary = (staff: StaffMember): UserSummary => ({
  id: staff.id,
  email: staff.email,
  phone: staff.phone,
  displayName: staff.displayName,
  role: staff.role,
  status: staff.status,
  code: staff.staffCode,
  emailVerified: staff.emailVerified,
  createdAt: staff.createdAt,
});

type FormState = { open: false } | { open: true; staff: StaffMember | null };

// FR-07 · /app/staff: Center Manager tạo và cập nhật Coach / Receptionist
export function StaffPage() {
  const [params, setParams] = useSearchParams();
  const role = isStaffRole(params.get('role')) ? (params.get('role') as StaffRole) : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [form, setForm] = useState<FormState>({ open: false });
  const [statusTarget, setStatusTarget] = useState<UserSummary | null>(null);

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

  const staffList = useStaffList({ q: debouncedSearch || undefined, role, page, pageSize: PAGE_SIZE });
  const items = staffList.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Nhân sự"
        title="Quản lý nhân sự"
        description="Tạo và cập nhật tài khoản Coach, Receptionist. Mã nhân sự là duy nhất."
        actions={
          <Button icon={<Plus aria-hidden="true" />} onClick={() => setForm({ open: true, staff: null })}>
            Thêm nhân sự
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <label className="relative block">
          <span className="sr-only">Tìm kiếm nhân sự</span>
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Tên, email, số điện thoại hoặc mã nhân sự"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="sr-only">Lọc theo vai trò</span>
          <select className={inputClass} value={role ?? ''} onChange={(event) => update({ role: event.target.value || undefined })}>
            <option value="">Tất cả vai trò</option>
            {staffRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {staffList.isPending ? (
        <ListSkeleton rows={5} label="Đang tải danh sách nhân sự…" />
      ) : staffList.isError ? (
        <ErrorState error={staffList.error} onRetry={() => staffList.refetch()} retrying={staffList.isRefetching} pendingApi="GET /api/staff" />
      ) : items.length === 0 ? (
        <EmptyState icon={<IdentificationBadge />} title="Chưa có nhân sự phù hợp" description="Thử từ khóa khác hoặc thêm nhân sự mới." />
      ) : (
        <div className={`transition-opacity ${staffList.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={staffList.isFetching}>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-bold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Nhân sự</th>
                  <th scope="col" className="px-4 py-3">Vai trò</th>
                  <th scope="col" className="px-4 py-3">Mã</th>
                  <th scope="col" className="px-4 py-3">Ngày vào làm</th>
                  <th scope="col" className="px-4 py-3">Tài khoản</th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((staff) => {
                  const work = staff.coachStatus ? coachStatusOption(staff.coachStatus) : undefined;
                  const locked = staff.status === 'LOCKED';
                  return (
                    <tr key={staff.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">{staff.displayName}</p>
                        <p className="text-xs text-muted">
                          {staff.email}
                          {staff.phone ? ` · ${staff.phone}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {staffRoleLabel(staff.role)}
                        {work && work.value !== 'ACTIVE' && (
                          <Chip tone={work.tone} className="ml-2">
                            {work.label}
                          </Chip>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink">{staff.staffCode ?? '—'}</td>
                      <td className="px-4 py-3 text-ink">{staff.hiredAt ? staff.hiredAt.split('-').reverse().join('/') : '—'}</td>
                      <td className="px-4 py-3">
                        <Chip tone={statusTone(staff.status)} dot>
                          {statusLabel(staff.status)}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {staff.role === 'COACH' && (
                            <Link
                              className="inline-flex min-h-9 items-center rounded-control px-3 text-[13px] font-bold text-primary-deep hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-primary"
                              to={`/app/coaches/${staff.id}`}
                            >
                              Hồ sơ Coach
                            </Link>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => setForm({ open: true, staff })} aria-label={`Sửa ${staff.displayName}`}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStatusTarget(toUserSummary(staff))}
                            aria-label={`${locked ? 'Mở khóa' : 'Khóa'} ${staff.displayName}`}
                          >
                            {locked ? 'Mở khóa' : 'Khóa'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={staffList.data.page}
            pageSize={staffList.data.pageSize}
            total={staffList.data.total}
            disabled={staffList.isFetching}
            onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
          />
        </div>
      )}

      <StaffFormDialog open={form.open} staff={form.open ? form.staff : null} onClose={() => setForm({ open: false })} />
      <UserStatusDialog user={statusTarget} onClose={() => setStatusTarget(null)} />
    </div>
  );
}
