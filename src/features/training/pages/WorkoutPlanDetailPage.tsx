import { ArrowDown, ArrowLeft, ArrowUp, ArrowsClockwise, NotePencil, Plus, Trash, UserPlus } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { AssignToEnrollmentDialog } from '../components/AssignPlanDialogs';
import { PlanItemFormDialog, type PlanItemDraft } from '../components/PlanItemFormDialog';
import { PlanItemList } from '../components/PlanItemList';
import { PlanStatusDialog } from '../components/PlanStatusDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { ConfirmDialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton, Skeleton } from '../components/ui/States';
import { cardClass, iconButtonClass } from '../components/ui/styles';
import { WorkoutPlanFormDialog } from '../components/WorkoutPlanFormDialog';
import { parseApiError } from '../errors';
import { formatDateTime } from '../format';
import { useDeletePlanItem, useReorderPlanItems, useWorkoutPlan } from '../hooks/useWorkoutPlans';
import { levelLabel, planStatusLabels, planStatusTones } from '../labels';
import { groupPlanItems, planWeekNumbers } from '../planStructure';
import type { WorkoutPlanDetail, WorkoutPlanItem } from '../types';

const MAX_SESSIONS = 14;

// FR-50 · /coach/workout-plans/:planId
export function WorkoutPlanDetailPage() {
  const planId = Number(useParams().planId);
  const plan = useWorkoutPlan(planId);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Link
        to="/coach/workout-plans"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-primary-deep hover:underline"
      >
        <ArrowLeft aria-hidden="true" /> Giáo án
      </Link>
      {plan.isPending ? (
        <div className="space-y-4">
          <div className={`${cardClass} space-y-3 p-6`} aria-hidden="true">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <ListSkeleton rows={3} label="Đang tải giáo án…" />
        </div>
      ) : plan.isError ? (
        <ErrorState error={plan.error} onRetry={() => plan.refetch()} retrying={plan.isRefetching} />
      ) : (
        <PlanDetail plan={plan.data} />
      )}
    </div>
  );
}

function PlanDetail({ plan }: { plan: WorkoutPlanDetail }) {
  const [params, setParams] = useSearchParams();
  const weekNumbers = planWeekNumbers(plan.durationWeeks, plan.items);
  const weeks = new Map(groupPlanItems(plan.items).map((week) => [week.weekNumber, week]));
  const requestedWeek = Number(params.get('week'));
  const selectedWeek = weekNumbers.includes(requestedWeek) ? requestedWeek : weekNumbers[0];
  const week = weeks.get(selectedWeek);

  const [editingPlan, setEditingPlan] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [itemTarget, setItemTarget] = useState<{ item: WorkoutPlanItem } | { draft: PlanItemDraft } | null>(null);
  const [deleting, setDeleting] = useState<WorkoutPlanItem | null>(null);

  const reorder = useReorderPlanItems(plan.id);
  const [announcement, setAnnouncement] = useState('');
  const moveButtons = useRef(new Map<string, HTMLButtonElement>());
  const [focusKey, setFocusKey] = useState<string | null>(null);

  // Giữ focus trên mục vừa di chuyển để thao tác bàn phím liên tục
  useEffect(() => {
    if (!focusKey) return;
    const [itemId, direction] = focusKey.split(':');
    const button = moveButtons.current.get(focusKey);
    const fallback = moveButtons.current.get(`${itemId}:${direction === 'up' ? 'down' : 'up'}`);
    (button && !button.disabled ? button : fallback)?.focus();
  }, [focusKey, plan.items]);

  const move = (item: WorkoutPlanItem, slotItems: WorkoutPlanItem[], direction: 'up' | 'down') => {
    // Không khóa nút khi đang lưu (giữ focus cho bàn phím), chỉ bỏ qua thao tác chồng
    if (reorder.isPending) return;
    const index = slotItems.findIndex((entry) => entry.id === item.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= slotItems.length) return;
    const ordered = [...slotItems];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    reorder.mutate(
      { items: ordered.map((entry, position) => ({ itemId: entry.id, itemOrder: position + 1 })) },
      {
        onError: (error) => toast(parseApiError(error).message, 'error'),
      },
    );
    setAnnouncement(`Đã chuyển "${item.title}" tới vị trí ${target + 1} trên ${slotItems.length}.`);
    setFocusKey(`${item.id}:${direction}`);
  };

  const nextSessionNumber = Math.min(MAX_SESSIONS, Math.max(0, ...(week?.sessions.map((session) => session.sessionNumber) ?? [])) + 1);
  const lastItemOfActive = plan.status === 'ACTIVE' && plan.itemCount <= 1;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <Chip tone="primary">{plan.sport.name}</Chip>
              <Chip>{levelLabel(plan.level)}</Chip>
              <Chip tone={planStatusTones[plan.status]} dot>
                {planStatusLabels[plan.status]}
              </Chip>
            </div>
            <h1 className="mt-3 text-2xl leading-tight font-extrabold tracking-[-.02em] text-ink sm:text-[28px]">{plan.name}</h1>
            {plan.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{plan.description}</p>}
            <p className="mt-3 text-[13px] text-muted">
              {plan.durationWeeks ? `${plan.durationWeeks} tuần · ` : ''}
              {plan.itemCount} mục · đã gán {plan.assignmentCount} khóa 1-1 · tạo bởi {plan.createdBy.displayName} · cập nhật{' '}
              {formatDateTime(plan.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<NotePencil aria-hidden="true" />} onClick={() => setEditingPlan(true)}>
              Sửa thông tin
            </Button>
            <Button variant="secondary" icon={<ArrowsClockwise aria-hidden="true" />} onClick={() => setStatusOpen(true)}>
              Đổi trạng thái
            </Button>
            {plan.status === 'ACTIVE' && (
              <Button icon={<UserPlus aria-hidden="true" />} onClick={() => setAssignOpen(true)}>
                Gán cho khóa 1-1
              </Button>
            )}
          </div>
        </div>
        {plan.status !== 'ACTIVE' && (
          <div className="mt-4">
            <InlineAlert tone="info">
              Giáo án đang ở trạng thái {planStatusLabels[plan.status]}. Chỉ giáo án Đang dùng mới gán được cho khóa 1-1.
            </InlineAlert>
          </div>
        )}
      </Card>

      <nav aria-label="Chọn tuần" className="flex flex-wrap gap-2">
        {weekNumbers.map((weekNumber) => {
          const selected = weekNumber === selectedWeek;
          const count = weeks.get(weekNumber)?.itemCount ?? 0;
          return (
            <button
              key={weekNumber}
              type="button"
              aria-pressed={selected}
              onClick={() => setParams({ week: String(weekNumber) }, { replace: true })}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary/40'
              }`}
            >
              Tuần {weekNumber}
              <span className={`rounded-full px-1.5 text-[11px] ${selected ? 'bg-white/20' : 'bg-canvas text-muted'}`}>{count}</span>
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="week-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="week-heading" className="text-lg font-extrabold text-ink">
            Tuần {selectedWeek}
          </h2>
          <Button
            variant="secondary"
            icon={<Plus aria-hidden="true" />}
            disabled={nextSessionNumber > MAX_SESSIONS || (week?.sessions.length ?? 0) >= MAX_SESSIONS}
            onClick={() => setItemTarget({ draft: { weekNumber: selectedWeek, sessionNumber: week ? nextSessionNumber : 1 } })}
          >
            {week ? 'Thêm buổi mới' : 'Thêm mục đầu tiên'}
          </Button>
        </div>

        {!week ? (
          <EmptyState
            title={`Tuần ${selectedWeek} chưa có mục nào`}
            description="Thêm các bài tập theo buổi; mỗi buổi có thứ tự riêng bắt đầu từ 1."
          />
        ) : (
          <div className="space-y-4">
            {week.sessions.map((session) => (
              <Card key={session.sessionNumber} className="p-5" aria-labelledby={`session-${session.sessionNumber}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 id={`session-${session.sessionNumber}`} className="text-[11px] font-extrabold tracking-[.08em] text-primary-deep uppercase">
                    Buổi {session.sessionNumber} · {session.items.length} mục
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Plus aria-hidden="true" />}
                    onClick={() => setItemTarget({ draft: { weekNumber: selectedWeek, sessionNumber: session.sessionNumber } })}
                  >
                    Thêm mục
                  </Button>
                </div>
                <PlanItemList
                  items={session.items}
                  renderActions={(item, index, slotItems) => (
                    <>
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) moveButtons.current.set(`${item.id}:up`, node);
                          else moveButtons.current.delete(`${item.id}:up`);
                        }}
                        className={iconButtonClass}
                        disabled={index === 0}
                        onClick={() => move(item, slotItems, 'up')}
                        aria-label={`Đưa "${item.title}" lên`}
                      >
                        <ArrowUp aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) moveButtons.current.set(`${item.id}:down`, node);
                          else moveButtons.current.delete(`${item.id}:down`);
                        }}
                        className={iconButtonClass}
                        disabled={index === slotItems.length - 1}
                        onClick={() => move(item, slotItems, 'down')}
                        aria-label={`Đưa "${item.title}" xuống`}
                      >
                        <ArrowDown aria-hidden="true" />
                      </button>
                      <button type="button" className={iconButtonClass} onClick={() => setItemTarget({ item })} aria-label={`Sửa "${item.title}"`}>
                        <NotePencil aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${iconButtonClass} hover:bg-danger/10 hover:text-danger`}
                        onClick={() => setDeleting(item)}
                        aria-label={`Xóa "${item.title}"`}
                      >
                        <Trash aria-hidden="true" />
                      </button>
                    </>
                  )}
                />
              </Card>
            ))}
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </section>

      <WorkoutPlanFormDialog open={editingPlan} plan={plan} onClose={() => setEditingPlan(false)} />
      <PlanStatusDialog plan={statusOpen ? plan : null} onClose={() => setStatusOpen(false)} />
      <AssignToEnrollmentDialog open={assignOpen} plan={plan} onClose={() => setAssignOpen(false)} />
      <PlanItemFormDialog planId={plan.id} durationWeeks={plan.durationWeeks} target={itemTarget} onClose={() => setItemTarget(null)} />
      <DeleteItemDialog planId={plan.id} item={deleting} blocked={lastItemOfActive} onClose={() => setDeleting(null)} />
    </div>
  );
}

function DeleteItemDialog({ planId, item, blocked, onClose }: { planId: number; item: WorkoutPlanItem | null; blocked: boolean; onClose: () => void }) {
  const remove = useDeletePlanItem(planId);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = () => {
    if (!item || blocked) return;
    remove.mutate(item.id, {
      onSuccess: () => {
        toast(`Đã xóa "${item.title}". Thứ tự trong buổi được đánh lại liên tục.`);
        close();
      },
      onError: (mutationError) => setError(parseApiError(mutationError).message),
    });
  };

  return (
    <ConfirmDialog
      open={item !== null}
      title="Xóa mục giáo án?"
      tone="danger"
      confirmLabel="Xóa mục"
      loading={remove.isPending}
      confirmDisabled={blocked}
      onConfirm={confirm}
      onCancel={close}
      description={
        item && (
          <p>
            Xóa <b>{item.title}</b> khỏi Tuần {item.weekNumber}, Buổi {item.sessionNumber}. Các mục còn lại trong buổi sẽ được đánh lại thứ tự.
          </p>
        )
      }
      error={
        blocked ? (
          <InlineAlert tone="warning">Đây là mục cuối cùng của giáo án đang dùng. Hãy thêm mục khác hoặc chuyển giáo án về Nháp trước khi xóa.</InlineAlert>
        ) : error ? (
          <InlineAlert>{error}</InlineAlert>
        ) : undefined
      }
    />
  );
}
