import { ArrowsClockwise, MagnifyingGlass, NotePencil, Plus } from '@phosphor-icons/react';
import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlanStatusDialog } from '../components/PlanStatusDialog';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Field, SegmentedControl } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States';
import { cardClass, inputClass } from '../components/ui/styles';
import { WorkoutPlanFormDialog } from '../components/WorkoutPlanFormDialog';
import { parseApiError } from '../errors';
import { formatDate } from '../format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useSports } from '../hooks/usePendingApis';
import { useWorkoutPlans } from '../hooks/useWorkoutPlans';
import { levelLabel, planLevels, planStatusLabels, planStatusTones } from '../labels';
import type { PlanLevel, PlanStatus, WorkoutPlan } from '../types';

const PAGE_SIZE = 20;
const statusFilters = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: planStatusLabels.DRAFT },
  { value: 'ACTIVE', label: planStatusLabels.ACTIVE },
  { value: 'INACTIVE', label: planStatusLabels.INACTIVE },
] as const;
type StatusFilter = (typeof statusFilters)[number]['value'];

// FR-49 · /coach/workout-plans
export function WorkoutPlansPage() {
  const id = useId();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [formPlan, setFormPlan] = useState<WorkoutPlan | 'new' | null>(null);
  const [statusPlan, setStatusPlan] = useState<WorkoutPlan | null>(null);
  const sports = useSports();

  const sportId = Number(params.get('sportId')) || undefined;
  const level = (planLevels as string[]).includes(params.get('level') ?? '') ? (params.get('level') as PlanLevel) : undefined;
  const status = (['DRAFT', 'ACTIVE', 'INACTIVE'] as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as PlanStatus)
    : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);

  const plans = useWorkoutPlans({ page, pageSize: PAGE_SIZE, sportId, level, status, search: debouncedSearch || undefined });

  const updateParams = (patch: Record<string, string | undefined>) =>
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

  // Đồng bộ từ khóa tìm kiếm (đã debounce) lên URL
  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedSearch) updateParams({ q: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi từ khóa đổi
  }, [debouncedSearch]);

  const hasFilters = Boolean(sportId || level || status || debouncedSearch);
  const clearFilters = () => {
    setSearch('');
    setParams({}, { replace: true });
  };
  const items = plans.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Giáo án"
        title="Giáo án dùng chung"
        description="Giáo án theo môn, dùng chung cho mọi Coach. Chỉ giáo án Đang dùng mới gán được cho khóa 1-1."
        actions={
          <Button icon={<Plus weight="bold" aria-hidden="true" />} onClick={() => setFormPlan('new')}>
            Tạo giáo án
          </Button>
        }
      />

      <div className={`${cardClass} p-4 sm:p-5`}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field id={`${id}-search`} label="Tìm kiếm">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id={`${id}-search`}
                type="search"
                className={`${inputClass} pl-9`}
                placeholder="Tên giáo án…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </Field>
          <Field
            id={`${id}-sport`}
            label="Môn"
            hint={sports.isError ? (parseApiError(sports.error).kind === 'not-ready' ? 'Chưa sẵn sàng (cần API GET /api/sports)' : 'Không tải được danh sách môn') : undefined}
          >
            <select
              id={`${id}-sport`}
              className={inputClass}
              value={sportId ?? ''}
              disabled={!sports.data}
              aria-describedby={sports.isError ? `${id}-sport-hint` : undefined}
              onChange={(event) => updateParams({ sportId: event.target.value })}
            >
              <option value="">Tất cả môn</option>
              {sports.data?.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-level`} label="Cấp độ">
            <select id={`${id}-level`} className={inputClass} value={level ?? ''} onChange={(event) => updateParams({ level: event.target.value })}>
              <option value="">Tất cả cấp độ</option>
              {planLevels.map((value) => (
                <option key={value} value={value}>
                  {levelLabel(value)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <SegmentedControl<StatusFilter>
            name={`${id}-status`}
            legend="Trạng thái"
            className="w-full sm:w-[440px]"
            options={statusFilters}
            value={(status ?? 'ALL') as StatusFilter}
            onChange={(value) => updateParams({ status: value === 'ALL' ? undefined : value })}
          />
          <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
            Xóa bộ lọc
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {plans.isPending ? (
          <ListSkeleton rows={5} label="Đang tải giáo án…" />
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => plans.refetch()} retrying={plans.isRefetching} />
        ) : items.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Không có giáo án phù hợp' : 'Chưa có giáo án nào'}
            description={hasFilters ? 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc.' : 'Tạo giáo án đầu tiên, thêm các mục theo tuần/buổi rồi kích hoạt để gán cho khóa 1-1.'}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button icon={<Plus weight="bold" aria-hidden="true" />} onClick={() => setFormPlan('new')}>
                  Tạo giáo án
                </Button>
              )
            }
          />
        ) : (
          <div className={`transition-opacity ${plans.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={plans.isFetching}>
            <PlanTable items={items} onEdit={setFormPlan} onChangeStatus={setStatusPlan} />
            <PlanCards items={items} onEdit={setFormPlan} onChangeStatus={setStatusPlan} />
            <Pagination
              page={plans.data.page}
              pageSize={plans.data.pageSize}
              total={plans.data.total}
              disabled={plans.isFetching}
              onChange={(next) => updateParams({ page: String(next) })}
            />
          </div>
        )}
      </div>

      <WorkoutPlanFormDialog
        open={formPlan !== null}
        plan={formPlan === 'new' || formPlan === null ? undefined : formPlan}
        onClose={() => setFormPlan(null)}
        onCreated={(plan) => navigate(`/coach/workout-plans/${plan.id}`)}
      />
      <PlanStatusDialog plan={statusPlan} onClose={() => setStatusPlan(null)} />
    </div>
  );
}

type ListProps = {
  items: WorkoutPlan[];
  onEdit: (plan: WorkoutPlan) => void;
  onChangeStatus: (plan: WorkoutPlan) => void;
};

function RowActions({ plan, onEdit, onChangeStatus }: { plan: WorkoutPlan } & Omit<ListProps, 'items'>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="secondary" icon={<NotePencil aria-hidden="true" />} onClick={() => onEdit(plan)} aria-label={`Sửa ${plan.name}`}>
        Sửa
      </Button>
      <Button size="sm" variant="ghost" icon={<ArrowsClockwise aria-hidden="true" />} onClick={() => onChangeStatus(plan)} aria-label={`Đổi trạng thái ${plan.name}`}>
        Trạng thái
      </Button>
    </div>
  );
}

function PlanTable({ items, onEdit, onChangeStatus }: ListProps) {
  return (
    <div className={`${cardClass} hidden overflow-x-auto md:block`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas text-xs font-bold tracking-[.04em] text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Giáo án</th>
            <th scope="col" className="px-4 py-3">Môn</th>
            <th scope="col" className="px-4 py-3">Cấp độ</th>
            <th scope="col" className="px-4 py-3 text-center">Số tuần</th>
            <th scope="col" className="px-4 py-3 text-center">Số mục</th>
            <th scope="col" className="px-4 py-3">Trạng thái</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((plan) => (
            <tr key={plan.id} className="align-middle hover:bg-canvas/70">
              <td className="max-w-80 px-4 py-3">
                <Link to={`/coach/workout-plans/${plan.id}`} className="font-bold text-primary-deep hover:underline">
                  {plan.name}
                </Link>
                {plan.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{plan.description}</p>}
                <p className="mt-0.5 text-xs text-muted">
                  Cập nhật {formatDate(plan.updatedAt)} · gán {plan.assignmentCount} khóa
                </p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{plan.sport.name}</td>
              <td className="px-4 py-3 whitespace-nowrap">{levelLabel(plan.level)}</td>
              <td className="px-4 py-3 text-center tabular-nums">{plan.durationWeeks ?? '—'}</td>
              <td className="px-4 py-3 text-center tabular-nums">{plan.itemCount}</td>
              <td className="px-4 py-3">
                <Chip tone={planStatusTones[plan.status]} dot>
                  {planStatusLabels[plan.status]}
                </Chip>
              </td>
              <td className="px-4 py-3">
                <RowActions plan={plan} onEdit={onEdit} onChangeStatus={onChangeStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanCards({ items, onEdit, onChangeStatus }: ListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {items.map((plan) => (
        <li key={plan.id} className={`${cardClass} p-4`}>
          <p className="text-[11px] font-extrabold tracking-[.08em] text-primary-deep uppercase">{plan.sport.name}</p>
          <Link to={`/coach/workout-plans/${plan.id}`} className="mt-1 block font-bold text-ink hover:underline">
            {plan.name}
          </Link>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{levelLabel(plan.level)}</Chip>
            <Chip tone={planStatusTones[plan.status]} dot>
              {planStatusLabels[plan.status]}
            </Chip>
          </div>
          <p className="mt-2 text-xs text-muted">
            {plan.durationWeeks ? `${plan.durationWeeks} tuần · ` : ''}
            {plan.itemCount} mục · gán {plan.assignmentCount} khóa
          </p>
          <div className="mt-3">
            <RowActions plan={plan} onEdit={onEdit} onChangeStatus={onChangeStatus} />
          </div>
        </li>
      ))}
    </ul>
  );
}
