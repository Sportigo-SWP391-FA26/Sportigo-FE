import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from '../../../components/feedback/toast';
import { applyFieldErrors, parseApiError } from '../errors';
import { useCreatePlanItem, useUpdatePlanItem } from '../hooks/useWorkoutPlans';
import { intensityLabel, intensityOptions } from '../labels';
import { planItemFormSchema, type PlanItemFormOutput, type PlanItemFormValues } from '../schemas';
import type { PlanItemInput, WorkoutPlanItem } from '../types';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Field } from './ui/Field';
import { InlineAlert } from './ui/States';
import { describedBy, inputClass, textareaClass } from './ui/styles';

export type PlanItemDraft = { weekNumber: number; sessionNumber: number };

type Props = {
  planId: number;
  durationWeeks: number | null;
  /** item → sửa; draft → thêm mới vào tuần/buổi đã chọn */
  target: { item: WorkoutPlanItem } | { draft: PlanItemDraft } | null;
  onClose: () => void;
};

const FIELDS = [
  'weekNumber',
  'sessionNumber',
  'itemOrder',
  'title',
  'content',
  'durationMinutes',
  'sets',
  'repetitions',
  'intensity',
  'note',
] as const;

const NULLABLE = new Set(['durationMinutes', 'sets', 'repetitions', 'intensity', 'note']);

export function PlanItemFormDialog({ planId, durationWeeks, target, onClose }: Props) {
  const editing = target && 'item' in target ? target.item : undefined;
  return (
    <Dialog open={target !== null} onClose={onClose} title={editing ? 'Sửa mục giáo án' : 'Thêm mục giáo án'} size="lg">
      {target && <ItemForm key={editing?.id ?? 'new'} planId={planId} durationWeeks={durationWeeks} target={target} onClose={onClose} />}
    </Dialog>
  );
}

function ItemForm({ planId, durationWeeks, target, onClose }: Omit<Props, 'target'> & { target: NonNullable<Props['target']> }) {
  const id = useId();
  const item = 'item' in target ? target.item : undefined;
  const draft = 'draft' in target ? target.draft : undefined;
  const create = useCreatePlanItem(planId);
  const update = useUpdatePlanItem(planId);
  const [formError, setFormError] = useState<string | null>(null);
  const maxWeek = durationWeeks ?? 104;

  const form = useForm<PlanItemFormValues, unknown, PlanItemFormOutput>({
    resolver: zodResolver(planItemFormSchema),
    defaultValues: {
      weekNumber: item?.weekNumber ?? draft?.weekNumber ?? 1,
      sessionNumber: item?.sessionNumber ?? draft?.sessionNumber ?? 1,
      itemOrder: item?.itemOrder ?? '',
      title: item?.title ?? '',
      content: item?.content ?? '',
      durationMinutes: item?.durationMinutes ?? '',
      sets: item?.sets ?? '',
      repetitions: item?.repetitions ?? '',
      intensity: item?.intensity ?? '',
      note: item?.note ?? '',
    },
  });
  const { errors, dirtyFields, isSubmitting } = form.formState;
  const pending = isSubmitting || create.isPending || update.isPending;
  // Giá trị cường độ lạ (backend nhận chuỗi tự do) vẫn được giữ trong danh sách chọn
  const customIntensity = item?.intensity && !intensityOptions.some((option) => option.value === item.intensity) ? item.intensity : null;

  const onSubmit = async (values: PlanItemFormOutput) => {
    setFormError(null);
    if (values.weekNumber > maxWeek) {
      form.setError('weekNumber', { message: `Giáo án chỉ có ${maxWeek} tuần` });
      return;
    }
    try {
      if (item) {
        const changed: Record<string, unknown> = {};
        for (const field of FIELDS) {
          if (!dirtyFields[field]) continue;
          const value = values[field];
          changed[field] = value === undefined || value === '' ? (NULLABLE.has(field) ? null : undefined) : value;
        }
        if (Object.keys(changed).length > 0) {
          await update.mutateAsync({ itemId: item.id, input: changed as Partial<PlanItemInput> });
          toast('Đã cập nhật mục giáo án.');
        }
      } else {
        const input: PlanItemInput = {
          weekNumber: values.weekNumber,
          sessionNumber: values.sessionNumber,
          title: values.title,
          content: values.content,
          ...(values.itemOrder !== undefined && { itemOrder: values.itemOrder }),
          ...(values.durationMinutes !== undefined && { durationMinutes: values.durationMinutes }),
          ...(values.sets !== undefined && { sets: values.sets }),
          ...(values.repetitions !== undefined && { repetitions: values.repetitions }),
          ...(values.intensity && { intensity: values.intensity }),
          ...(values.note && { note: values.note }),
        };
        await create.mutateAsync(input);
        toast(`Đã thêm "${values.title}" vào Tuần ${values.weekNumber}, Buổi ${values.sessionNumber}.`);
      }
      onClose();
    } catch (error) {
      const apiError = parseApiError(error);
      const applied = applyFieldErrors(form.setError, apiError, FIELDS, {
        DUPLICATE_ITEM_ORDER: 'itemOrder',
        WEEK_OUT_OF_RANGE: 'weekNumber',
      });
      if (!applied) setFormError(apiError.message);
    }
  };

  const numberField = (name: (typeof FIELDS)[number], label: string, options: { min: number; max: number; required?: boolean; hint?: string }) => (
    <Field id={`${id}-${name}`} label={label} required={options.required} error={errors[name]?.message} hint={options.hint}>
      <input
        id={`${id}-${name}`}
        type="number"
        inputMode="numeric"
        min={options.min}
        max={options.max}
        className={inputClass}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={describedBy(`${id}-${name}`, { error: errors[name], hint: options.hint })}
        {...form.register(name)}
      />
    </Field>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {numberField('weekNumber', 'Tuần', { min: 1, max: maxWeek, required: true, hint: durationWeeks ? `1 – ${durationWeeks}` : undefined })}
        {numberField('sessionNumber', 'Buổi', { min: 1, max: 14, required: true, hint: '1 – 14' })}
        {numberField('itemOrder', 'Thứ tự', { min: 1, max: 1000, hint: item ? undefined : 'Để trống để xếp cuối buổi' })}
      </div>

      <Field id={`${id}-title`} label="Tiêu đề" required error={errors.title?.message}>
        <input
          id={`${id}-title`}
          className={inputClass}
          placeholder="Ví dụ: Khởi động"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describedBy(`${id}-title`, { error: errors.title })}
          {...form.register('title')}
        />
      </Field>

      <Field id={`${id}-content`} label="Nội dung" required error={errors.content?.message}>
        <textarea
          id={`${id}-content`}
          className={textareaClass}
          placeholder="Mô tả bài tập, kỹ thuật cần chú ý…"
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={describedBy(`${id}-content`, { error: errors.content })}
          {...form.register('content')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        {numberField('durationMinutes', 'Thời lượng (phút)', { min: 1, max: 600 })}
        {numberField('sets', 'Số hiệp', { min: 1, max: 100 })}
        {numberField('repetitions', 'Số lần', { min: 1, max: 1000 })}
        <Field id={`${id}-intensity`} label="Cường độ" error={errors.intensity?.message}>
          <select id={`${id}-intensity`} className={inputClass} {...form.register('intensity')}>
            <option value="">Không ghi</option>
            {intensityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {customIntensity && <option value={customIntensity}>{intensityLabel(customIntensity)}</option>}
          </select>
        </Field>
      </div>

      <Field id={`${id}-note`} label="Ghi chú" error={errors.note?.message}>
        <textarea
          id={`${id}-note`}
          className={`${textareaClass} min-h-16`}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={describedBy(`${id}-note`, { error: errors.note })}
          {...form.register('note')}
        />
      </Field>

      {formError && <InlineAlert>{formError}</InlineAlert>}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          {item ? 'Lưu thay đổi' : 'Thêm mục'}
        </Button>
      </div>
    </form>
  );
}
