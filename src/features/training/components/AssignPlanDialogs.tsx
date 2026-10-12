import { MagnifyingGlass } from '@phosphor-icons/react';
import { useId, useState, type ReactNode } from 'react';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../errors';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useCoachTrainees } from '../hooks/usePendingApis';
import { useAssignPlan } from '../hooks/usePlanAssignments';
import { useWorkoutPlans } from '../hooks/useWorkoutPlans';
import { enrollmentStatusLabels, levelLabel } from '../labels';
import type { PlanAssignment, SportRef, WorkoutPlan } from '../types';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Dialog } from './ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton, NotReady } from './ui/States';
import { inputClass } from './ui/styles';

const TRAINEES_API = 'GET /api/coaches/me/trainees';

function OptionCard({ checked, disabled, children }: { checked: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
        disabled ? 'cursor-not-allowed border-line bg-canvas opacity-70' : checked ? 'border-primary bg-primary/5' : 'border-line hover:border-primary/40'
      }`}
    >
      {children}
    </div>
  );
}

// ---------- Từ khóa 1-1: chọn giáo án ----------

type AssignPlanProps = {
  open: boolean;
  onClose: () => void;
  enrollmentId: number;
  /** Môn của khóa 1-1; null khi chưa xác định được */
  sport: SportRef | null;
  assignments: PlanAssignment[];
};

/** FR-51: chỉ liệt kê giáo án Đang dùng và cùng môn với khóa 1-1 */
export function AssignPlanDialog({ open, onClose, enrollmentId, sport, assignments }: AssignPlanProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Gán giáo án cho khóa 1-1" description={sport ? `Giáo án Đang dùng của môn ${sport.name}.` : undefined}>
      {sport ? (
        <PlanPicker enrollmentId={enrollmentId} sport={sport} assignments={assignments} onClose={onClose} />
      ) : (
        <NotReady
          compact
          title="Chưa xác định được môn của khóa 1-1"
          description="Cần thông tin khóa 1-1 để chỉ hiện giáo án cùng môn. Khi khóa đã có giáo án, môn được lấy từ giáo án đó."
          api={TRAINEES_API}
        />
      )}
    </Dialog>
  );
}

function PlanPicker({ enrollmentId, sport, assignments, onClose }: Omit<AssignPlanProps, 'open' | 'sport'> & { sport: SportRef }) {
  const id = useId();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plans = useWorkoutPlans({ status: 'ACTIVE', sportId: sport.id, search: debounced || undefined, pageSize: 100 });
  const assign = useAssignPlan(enrollmentId);
  const activeIds = new Set(assignments.filter((assignment) => assignment.status === 'ACTIVE').map((assignment) => assignment.workoutPlan.id));

  const submit = () => {
    if (!selected) return;
    setError(null);
    assign.mutate(selected, {
      onSuccess: (assignment) => {
        toast(`Đã gán "${assignment.workoutPlan.name}" cho khóa 1-1.`);
        onClose();
      },
      // 409 PLAN_ALREADY_ASSIGNED, ENROLLMENT_NOT_ACTIVE; 422 PLAN_NOT_ASSIGNABLE: hiện nguyên thông báo của backend
      onError: (mutationError) => setError(parseApiError(mutationError).message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor={`${id}-search`} className="sr-only">
          Tìm giáo án
        </label>
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={`${id}-search`}
          type="search"
          className={`${inputClass} pl-9`}
          placeholder="Tìm theo tên giáo án…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {plans.isPending ? (
        <ListSkeleton rows={3} label="Đang tải giáo án…" />
      ) : plans.isError ? (
        <ErrorState compact error={plans.error} onRetry={() => plans.refetch()} retrying={plans.isRefetching} />
      ) : plans.data.items.length === 0 ? (
        <EmptyState
          compact
          title="Không có giáo án phù hợp"
          description={`Chưa có giáo án Đang dùng nào của môn ${sport.name}${debounced ? ' khớp từ khóa' : ''}. Hãy kích hoạt hoặc tạo giáo án trước.`}
        />
      ) : (
        <fieldset>
          <legend className="sr-only">Chọn giáo án</legend>
          <ul className="space-y-2">
            {plans.data.items.map((plan: WorkoutPlan) => {
              const assigned = activeIds.has(plan.id);
              return (
                <li key={plan.id}>
                  <label className={assigned ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <OptionCard checked={selected === plan.id} disabled={assigned}>
                      <input
                        type="radio"
                        name={`${id}-plan`}
                        value={plan.id}
                        checked={selected === plan.id}
                        disabled={assigned}
                        onChange={() => setSelected(plan.id)}
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-ink">{plan.name}</span>
                        <span className="mt-1 block text-xs text-muted">
                          {levelLabel(plan.level)} · {plan.durationWeeks ? `${plan.durationWeeks} tuần · ` : ''}
                          {plan.itemCount} mục
                        </span>
                      </span>
                      {assigned && <Chip tone="success">Đang gán</Chip>}
                    </OptionCard>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {error && <InlineAlert>{error}</InlineAlert>}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={assign.isPending}>
          Hủy
        </Button>
        <Button onClick={submit} disabled={!selected} loading={assign.isPending}>
          Gán giáo án
        </Button>
      </div>
    </div>
  );
}

// ---------- Từ giáo án: chọn khóa 1-1 ----------

type AssignToEnrollmentProps = {
  open: boolean;
  onClose: () => void;
  plan: WorkoutPlan;
};

export function AssignToEnrollmentDialog({ open, onClose, plan }: AssignToEnrollmentProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Gán cho khóa 1-1" description={`Chọn khóa 1-1 môn ${plan.sport.name} bạn đang phụ trách.`}>
      {open && <EnrollmentPicker plan={plan} onClose={onClose} />}
    </Dialog>
  );
}

function EnrollmentPicker({ plan, onClose }: { plan: WorkoutPlan; onClose: () => void }) {
  const id = useId();
  const trainees = useCoachTrainees();
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assign = useAssignPlan(selected ?? 0);

  if (trainees.isPending) return <ListSkeleton rows={3} label="Đang tải khóa 1-1…" />;
  if (trainees.isError) {
    return <ErrorState compact error={trainees.error} onRetry={() => trainees.refetch()} pendingApi={TRAINEES_API} />;
  }

  const enrollments = trainees.data.flatMap((trainee) =>
    trainee.contexts.flatMap((context) =>
      context.type === 'PRIVATE_COURSE' && context.sport.id === plan.sport.id ? [{ member: trainee.member, ...context }] : [],
    ),
  );

  const submit = () => {
    if (!selected) return;
    setError(null);
    assign.mutate(plan.id, {
      onSuccess: () => {
        toast(`Đã gán "${plan.name}" cho khóa 1-1.`);
        onClose();
      },
      onError: (mutationError) => setError(parseApiError(mutationError).message),
    });
  };

  return (
    <div className="space-y-4">
      {enrollments.length === 0 ? (
        <EmptyState compact title="Không có khóa 1-1 phù hợp" description={`Bạn chưa phụ trách khóa 1-1 nào của môn ${plan.sport.name}.`} />
      ) : (
        <fieldset>
          <legend className="sr-only">Chọn khóa 1-1</legend>
          <ul className="space-y-2">
            {enrollments.map((enrollment) => {
              const inactive = enrollment.status !== 'ACTIVE';
              return (
                <li key={enrollment.privateEnrollmentId}>
                  <label className={inactive ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <OptionCard checked={selected === enrollment.privateEnrollmentId} disabled={inactive}>
                      <input
                        type="radio"
                        name={`${id}-enrollment`}
                        checked={selected === enrollment.privateEnrollmentId}
                        disabled={inactive}
                        onChange={() => setSelected(enrollment.privateEnrollmentId)}
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-ink">{enrollment.member.displayName}</span>
                        <span className="mt-1 block text-xs text-muted">
                          {enrollment.member.memberCode} · {enrollment.name}
                        </span>
                      </span>
                      <Chip tone={inactive ? 'neutral' : 'success'}>{enrollmentStatusLabels[enrollment.status]}</Chip>
                    </OptionCard>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={assign.isPending}>
          Hủy
        </Button>
        <Button onClick={submit} disabled={!selected} loading={assign.isPending}>
          Gán giáo án
        </Button>
      </div>
    </div>
  );
}
