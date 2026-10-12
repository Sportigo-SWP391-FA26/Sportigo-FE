import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from '../../../components/feedback/toast';
import { applyFieldErrors, parseApiError } from '../errors';
import { useSports } from '../hooks/usePendingApis';
import { useCreateWorkoutPlan, useUpdateWorkoutPlan } from '../hooks/useWorkoutPlans';
import { levelLabel, planLevels } from '../labels';
import { workoutPlanFormSchema, type WorkoutPlanFormOutput, type WorkoutPlanFormValues } from '../schemas';
import type { PlanLevel, WorkoutPlan, WorkoutPlanInput } from '../types';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Field, SegmentedControl } from './ui/Field';
import { InlineAlert } from './ui/States';
import { describedBy, inputClass, textareaClass } from './ui/styles';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Có plan → sửa; không có → tạo mới */
  plan?: WorkoutPlan;
  onCreated?: (plan: WorkoutPlan) => void;
};

const FIELDS = ['sportId', 'name', 'description', 'level', 'durationWeeks'] as const;

export function WorkoutPlanFormDialog({ open, onClose, plan, onCreated }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={plan ? 'Sửa thông tin giáo án' : 'Tạo giáo án'}
      description={plan ? undefined : 'Giáo án mới ở trạng thái Nháp. Thêm mục rồi kích hoạt để gán cho khóa 1-1.'}
    >
      <PlanForm plan={plan} onClose={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function PlanForm({ plan, onClose, onCreated }: Omit<Props, 'open'>) {
  const id = useId();
  const sports = useSports();
  const create = useCreateWorkoutPlan();
  const update = useUpdateWorkoutPlan(plan?.id ?? 0);
  const [formError, setFormError] = useState<string | null>(null);
  const sportLocked = Boolean(plan && plan.assignmentCount > 0);

  const form = useForm<WorkoutPlanFormValues, unknown, WorkoutPlanFormOutput>({
    resolver: zodResolver(workoutPlanFormSchema),
    defaultValues: {
      sportId: plan?.sport.id ?? '',
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      level: plan && (planLevels as string[]).includes(plan.level) ? plan.level : undefined,
      durationWeeks: plan?.durationWeeks ?? 4,
    },
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const pending = isSubmitting || create.isPending || update.isPending;

  const onSubmit = async (values: WorkoutPlanFormOutput) => {
    setFormError(null);
    const input: WorkoutPlanInput = {
      sportId: values.sportId,
      name: values.name,
      level: values.level as PlanLevel,
      description: values.description || null,
      durationWeeks: values.durationWeeks,
    };
    try {
      if (plan) {
        // Chỉ gửi trường đã đổi để không vô tình đổi môn của giáo án đã gán
        const changed = Object.fromEntries(Object.entries(input).filter(([key]) => dirtyFields[key as keyof WorkoutPlanFormValues]));
        if (Object.keys(changed).length === 0) {
          onClose();
          return;
        }
        await update.mutateAsync(changed);
        toast('Đã cập nhật giáo án.');
        onClose();
      } else {
        const created = await create.mutateAsync(input);
        toast('Đã tạo giáo án. Hãy thêm các mục tập luyện.');
        onClose();
        onCreated?.(created);
      }
    } catch (error) {
      const apiError = parseApiError(error);
      const applied = applyFieldErrors(form.setError, apiError, FIELDS, {
        SPORT_NOT_AVAILABLE: 'sportId',
        PLAN_SPORT_LOCKED: 'sportId',
        DURATION_TOO_SHORT: 'durationWeeks',
      });
      if (!applied || apiError.kind !== 'validation') setFormError(apiError.message);
    }
  };

  const sportField = () => {
    if (plan && (sportLocked || sports.isError)) {
      return (
        <div className={`${inputClass} flex items-center bg-canvas text-ink`} id={`${id}-sport`} aria-describedby={`${id}-sport-hint`}>
          {plan.sport.name}
        </div>
      );
    }
    return (
      <select
        id={`${id}-sport`}
        className={inputClass}
        disabled={sports.isPending || sports.isError}
        aria-invalid={errors.sportId ? true : undefined}
        aria-describedby={describedBy(`${id}-sport`, { error: errors.sportId, hint: sports.isError })}
        {...form.register('sportId')}
      >
        <option value="">{sports.isPending ? 'Đang tải danh sách môn…' : 'Chọn môn'}</option>
        {plan && !sports.data?.some((sport) => sport.id === plan.sport.id) && <option value={plan.sport.id}>{plan.sport.name}</option>}
        {sports.data?.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.name}
          </option>
        ))}
      </select>
    );
  };

  const sportHint = sportLocked
    ? 'Không thể đổi môn vì giáo án đã được gán cho khóa 1-1.'
    : sports.isError
      ? `${parseApiError(sports.error).kind === 'not-ready' ? 'Danh sách môn chưa sẵn sàng (cần API GET /api/sports).' : parseApiError(sports.error).message}${plan ? ' Giữ nguyên môn hiện tại.' : ''}`
      : undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id={`${id}-sport`} label="Môn" required error={errors.sportId?.message} hint={sportHint}>
        {sportField()}
      </Field>
      {!plan && sports.isError && (
        <InlineAlert tone="warning">Chưa thể tạo giáo án mới vì danh sách môn chưa sẵn sàng. Bạn vẫn có thể sửa các giáo án đã có.</InlineAlert>
      )}

      <Field id={`${id}-name`} label="Tên giáo án" required error={errors.name?.message}>
        <input
          id={`${id}-name`}
          className={inputClass}
          placeholder="Ví dụ: Bơi ếch nền tảng 4 tuần"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(`${id}-name`, { error: errors.name })}
          {...form.register('name')}
        />
      </Field>

      <Field id={`${id}-description`} label="Mô tả" error={errors.description?.message}>
        <textarea
          id={`${id}-description`}
          className={textareaClass}
          placeholder="Mục tiêu và đối tượng phù hợp"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describedBy(`${id}-description`, { error: errors.description })}
          {...form.register('description')}
        />
      </Field>

      <div>
        <Controller
          control={form.control}
          name="level"
          render={({ field }) => (
            <SegmentedControl
              name={`${id}-level`}
              legend="Cấp độ *"
              options={planLevels.map((value) => ({ value, label: levelLabel(value) }))}
              value={field.value as PlanLevel | undefined}
              onChange={field.onChange}
            />
          )}
        />
        {errors.level && <p className="mt-1.5 text-xs font-semibold text-danger">{errors.level.message}</p>}
      </div>

      <Field id={`${id}-weeks`} label="Số tuần" required error={errors.durationWeeks?.message} hint="Từ 1 đến 104 tuần." className="sm:w-48">
        <input
          id={`${id}-weeks`}
          type="number"
          inputMode="numeric"
          min={1}
          max={104}
          className={inputClass}
          aria-invalid={errors.durationWeeks ? true : undefined}
          aria-describedby={describedBy(`${id}-weeks`, { error: errors.durationWeeks, hint: true })}
          {...form.register('durationWeeks')}
        />
      </Field>

      {formError && <InlineAlert>{formError}</InlineAlert>}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" loading={pending} disabled={!plan && sports.isError}>
          {plan ? 'Lưu thay đổi' : 'Tạo giáo án'}
        </Button>
      </div>
    </form>
  );
}
