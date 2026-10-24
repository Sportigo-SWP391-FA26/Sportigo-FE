import { MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../training/components/ui/Card';
import { Pagination } from '../../training/components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { inputClass } from '../../training/components/ui/styles';
import { formatDate } from '../../training/format';
import { useDebouncedValue } from '../../training/hooks/useDebouncedValue';
import { useMyMembers } from '../hooks/useMemberProfile';
import type { CoachMember, CoachMembersQuery } from '../types';

const PAGE_SIZE = 20;
const typeOptions = [
  { value: 'CLASS', label: 'Lớp nhóm' },
  { value: 'PRIVATE', label: 'Khóa 1-1' },
] as const;
const isType = (value: string | null): value is NonNullable<CoachMembersQuery['type']> => value === 'CLASS' || value === 'PRIVATE';

function Goals({ member }: { member: CoachMember }) {
  const { workoutPlans, latestAssessment } = member.goals;
  if (workoutPlans.length === 0 && !latestAssessment) return <span className="text-muted">Chưa có</span>;
  return (
    <div className="space-y-1">
      {workoutPlans.map((plan) => (
        <p key={plan.id}>
          Giáo án: <strong>{plan.name}</strong> <span className="text-muted">({plan.level})</span>
        </p>
      ))}
      {latestAssessment?.recommendation && <p>Đề xuất: {latestAssessment.recommendation}</p>}
      {latestAssessment && (
        <p className="text-xs text-muted">
          Đánh giá gần nhất {latestAssessment.assessmentDate ? formatDate(latestAssessment.assessmentDate) : '—'}
          {latestAssessment.score !== null && ` · điểm ${latestAssessment.score}`}
          {latestAssessment.nextAssessmentDate && ` · lần tới ${formatDate(latestAssessment.nextAssessmentDate)}`}
        </p>
      )}
    </div>
  );
}

// FR-11 · /coach/members: học viên thuộc lớp hoặc khóa 1-1 của Coach
export function CoachMembersPage() {
  const [params, setParams] = useSearchParams();
  const type = isType(params.get('type')) ? (params.get('type') as CoachMembersQuery['type']) : undefined;
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

  const members = useMyMembers({ q: debouncedSearch || undefined, type, page, pageSize: PAGE_SIZE });
  const items = members.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Huấn luyện"
        title="Học viên của tôi"
        description="Hội viên trong lớp nhóm hoặc khóa 1-1 bạn phụ trách, kèm giáo án và đánh giá gần nhất."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <label className="relative block">
          <span className="sr-only">Tìm học viên</span>
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Tên hoặc mã hội viên"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="sr-only">Lọc theo loại</span>
          <select className={inputClass} value={type ?? ''} onChange={(event) => update({ type: event.target.value || undefined })}>
            <option value="">Lớp nhóm và 1-1</option>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {members.isPending ? (
        <ListSkeleton rows={5} label="Đang tải học viên…" />
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} retrying={members.isRefetching} pendingApi="GET /api/coaches/me/members" />
      ) : items.length === 0 ? (
        <EmptyState icon={<UsersThree />} title="Chưa có học viên" description="Học viên sẽ xuất hiện khi đăng ký lớp hoặc khóa 1-1 của bạn được xác nhận." />
      ) : (
        <div className={`transition-opacity ${members.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={members.isFetching}>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-bold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Học viên</th>
                  <th scope="col" className="px-4 py-3">Lớp / khóa với bạn</th>
                  <th scope="col" className="px-4 py-3">Mục tiêu & đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((member) => (
                  <tr key={member.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link to={`/coach/members/${member.id}`} className="font-bold text-ink hover:text-primary hover:underline">
                        {member.displayName}
                      </Link>
                      <p className="font-mono text-xs text-muted">{member.memberCode ?? '—'}</p>
                    </td>
                    <td className="space-y-1 px-4 py-3 text-ink">
                      {member.classes.map((groupClass) => (
                        <p key={`c-${groupClass.id}`}>
                          {groupClass.name} <span className="text-muted">· {groupClass.sport}</span>
                        </p>
                      ))}
                      {member.privateCourses.map((course) => (
                        <p key={`p-${course.enrollmentId}`}>
                          {course.name} (1-1) <span className="text-muted">· còn {course.remainingSessions} buổi</span>
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <Goals member={member} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={members.data.page}
            pageSize={members.data.pageSize}
            total={members.data.total}
            disabled={members.isFetching}
            onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
          />
        </div>
      )}
    </div>
  );
}
