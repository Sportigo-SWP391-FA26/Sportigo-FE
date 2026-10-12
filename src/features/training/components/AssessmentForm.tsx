import { Plus, X } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { contextValue, isContextAssessable, METRIC_SUGGESTIONS, toAssessmentInput } from '../assessmentPayload';
import { parseApiError } from '../errors';
import { addDays, todayInCenter } from '../format';
import { useCreateAssessment } from '../hooks/useAssessments';
import { enrollmentStatusLabels } from '../labels';
import { assessmentFormSchema, METRICS_MAX, type AssessmentFormOutput, type AssessmentFormValues } from '../schemas';
import type { ProgressAssessment, Trainee } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Field } from './ui/Field';
import { InlineAlert } from './ui/States';
import { describedBy, iconButtonClass, inputClass, textareaClass } from './ui/styles';

type Props = {
  trainees: Trainee[];
  onCreated: (assessment: ProgressAssessment) => void;
  onCancel: () => void;
};

const BACKEND_FIELDS = ['memberId', 'assessmentDate', 'coachComment', 'score', 'recommendation', 'nextAssessmentDate'] as const;

// FR-52 · Form ghi đánh giá tiến độ
export function AssessmentForm({ trainees, onCreated, onCancel }: Props) {
  const id = useId();
  const create = useCreateAssessment();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayInCenter();

  const form = useForm<AssessmentFormValues, unknown, AssessmentFormOutput>({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues: {
      memberId: '',
      context: '',
      assessmentDate: today,
      coachComment: '',
      metrics: [{ name: '', value: '' }],
      score: '',
      recommendation: '',
      nextAssessmentDate: '',
    },
  });
  const metrics = useFieldArray({ control: form.control, name: 'metrics' });
  const { errors, isSubmitting } = form.formState;
  const [watchedMember, selectedContext, assessmentDate, watchedMetrics] = useWatch({
    control: form.control,
    name: ['memberId', 'context', 'assessmentDate', 'metrics'],
  });
  const memberId = Number(watchedMember);
  const trainee = trainees.find((entry) => entry.member.id === memberId);
  const metricNames = (watchedMetrics ?? []).map((metric) => (metric?.name ?? '').trim().toLowerCase());
  const pending = isSubmitting || create.isPending;

  const onSubmit = async (values: AssessmentFormOutput) => {
    setFormError(null);
    try {
      onCreated(await create.mutateAsync(toAssessmentInput(values)));
    } catch (error) {
      const apiError = parseApiError(error);
      let applied = false;
      for (const field of BACKEND_FIELDS) {
        if (apiError.fieldErrors[field]) {
          form.setError(field, { type: 'server', message: apiError.fieldErrors[field] });
          applied = true;
        }
      }
      // BR-46: 403 ASSESSMENT_CONTEXT_INVALID hoặc lỗi validate về ngữ cảnh → hiện tại ô Ngữ cảnh
      const contextMessage =
        apiError.code === 'ASSESSMENT_CONTEXT_INVALID'
          ? apiError.message
          : apiError.fieldErrors.classRegistrationId ?? apiError.fieldErrors.privateEnrollmentId;
      if (contextMessage) {
        form.setError('context', { type: 'server', message: contextMessage }, { shouldFocus: true });
        applied = true;
      }
      if (apiError.fieldErrors.metrics) {
        form.setError('metrics', { type: 'server', message: apiError.fieldErrors.metrics });
        applied = true;
      }
      if (!applied || apiError.kind === 'forbidden') setFormError(apiError.message);
    }
  };

  const addMetric = (name = '') => {
    if (metrics.fields.length >= METRICS_MAX) return;
    // Thay dòng trống đầu tiên thay vì thêm dòng mới khi chọn gợi ý
    const emptyIndex = form.getValues('metrics').findIndex((metric) => !metric.name.trim() && metric.value === '');
    if (name && emptyIndex >= 0) form.setValue(`metrics.${emptyIndex}.name`, name, { shouldDirty: true });
    else metrics.append({ name, value: '' });
  };

  const metricsError = errors.metrics?.message ?? errors.metrics?.root?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-base font-extrabold text-ink">1. Học viên và ngữ cảnh</h2>
        <Field id={`${id}-member`} label="Học viên" required error={errors.memberId?.message}>
          <select
            id={`${id}-member`}
            className={inputClass}
            aria-invalid={errors.memberId ? true : undefined}
            aria-describedby={describedBy(`${id}-member`, { error: errors.memberId })}
            {...form.register('memberId', {
              // Đổi học viên thì bỏ ngữ cảnh đã chọn của học viên trước
              onChange: () => form.setValue('context', '', { shouldValidate: false }),
            })}
          >
            <option value="">Chọn học viên bạn phụ trách</option>
            {trainees.map((entry) => (
              <option key={entry.member.id} value={entry.member.id}>
                {entry.member.displayName} · {entry.member.memberCode}
              </option>
            ))}
          </select>
        </Field>

        <fieldset aria-describedby={errors.context ? `${id}-context-error` : undefined}>
          <legend className="mb-1.5 text-[13px] font-bold text-ink">
            Ngữ cảnh đánh giá <span className="text-danger" aria-hidden="true">*</span>
          </legend>
          <p className="mb-2 text-xs text-muted">Chọn đúng một lớp nhóm hoặc khóa 1-1 của học viên này.</p>
          {!trainee ? (
            <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">Chọn học viên để xem các lớp và khóa 1-1.</p>
          ) : trainee.contexts.length === 0 ? (
            <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">Học viên này không có lớp hoặc khóa 1-1 nào do bạn phụ trách.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {trainee.contexts.map((context) => {
                const value = contextValue(context);
                const disabled = !isContextAssessable(context);
                const checked = selectedContext === value;
                return (
                  <label
                    key={value}
                    className={`flex min-h-14 items-start gap-3 rounded-2xl border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                      disabled ? 'cursor-not-allowed border-line bg-canvas opacity-70' : checked ? 'cursor-pointer border-primary bg-primary/5' : 'cursor-pointer border-line hover:border-primary/40'
                    }`}
                  >
                    <input type="radio" value={value} disabled={disabled} className="mt-1 size-4 accent-primary" {...form.register('context')} />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-extrabold tracking-[.06em] text-primary-deep uppercase">
                        {context.type === 'GROUP_CLASS' ? 'Lớp nhóm' : 'Khóa 1-1'}
                      </span>
                      <span className="block font-bold text-ink">{context.name}</span>
                      <span className="block text-xs text-muted">
                        {context.sport.name}
                        {context.type === 'PRIVATE_COURSE' && ` · ${enrollmentStatusLabels[context.status]}`}
                        {disabled && ' · chưa thể đánh giá'}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {errors.context && (
            <p id={`${id}-context-error`} role="alert" className="mt-1.5 text-xs font-semibold text-danger">
              {errors.context.message}
            </p>
          )}
        </fieldset>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-base font-extrabold text-ink">2. Nội dung đánh giá</h2>
        <Field id={`${id}-date`} label="Ngày đánh giá" required error={errors.assessmentDate?.message} className="sm:w-60">
          <input
            id={`${id}-date`}
            type="date"
            max={today}
            className={inputClass}
            aria-invalid={errors.assessmentDate ? true : undefined}
            aria-describedby={describedBy(`${id}-date`, { error: errors.assessmentDate })}
            {...form.register('assessmentDate')}
          />
        </Field>

        <Field id={`${id}-comment`} label="Nhận xét" required error={errors.coachComment?.message}>
          <textarea
            id={`${id}-comment`}
            className={textareaClass}
            placeholder="Điểm tiến bộ, điều cần cải thiện…"
            aria-invalid={errors.coachComment ? true : undefined}
            aria-describedby={describedBy(`${id}-comment`, { error: errors.coachComment })}
            {...form.register('coachComment')}
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-bold text-ink">
            Chỉ số <span className="text-danger" aria-hidden="true">*</span>
          </legend>
          <p className="mb-2 text-xs text-muted">Tên và giá trị số. Ghi đơn vị trong tên để Member dễ hiểu biểu đồ.</p>
          <ul className="space-y-2">
            {metrics.fields.map((field, index) => {
              const nameError = errors.metrics?.[index]?.name?.message;
              const valueError = errors.metrics?.[index]?.value?.message;
              return (
                <li key={field.id} className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-start gap-2">
                  <div>
                    <label htmlFor={`${id}-metric-name-${index}`} className="sr-only">
                      Tên chỉ số {index + 1}
                    </label>
                    <input
                      id={`${id}-metric-name-${index}`}
                      className={inputClass}
                      placeholder="Tên chỉ số"
                      maxLength={50}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={nameError ? `${id}-metric-name-${index}-error` : undefined}
                      {...form.register(`metrics.${index}.name`)}
                    />
                    {nameError && (
                      <p id={`${id}-metric-name-${index}-error`} className="mt-1 text-xs font-semibold text-danger">
                        {nameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`${id}-metric-value-${index}`} className="sr-only">
                      Giá trị chỉ số {index + 1}
                    </label>
                    <input
                      id={`${id}-metric-value-${index}`}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className={inputClass}
                      placeholder="Giá trị"
                      aria-invalid={valueError ? true : undefined}
                      aria-describedby={valueError ? `${id}-metric-value-${index}-error` : undefined}
                      {...form.register(`metrics.${index}.value`)}
                    />
                    {valueError && (
                      <p id={`${id}-metric-value-${index}-error`} className="mt-1 text-xs font-semibold text-danger">
                        {valueError}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => metrics.remove(index)}
                    disabled={metrics.fields.length === 1}
                    aria-label={`Xóa chỉ số ${index + 1}`}
                  >
                    <X aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {metricsError && <p className="mt-1.5 text-xs font-semibold text-danger">{metricsError}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Plus aria-hidden="true" />} onClick={() => addMetric()} disabled={metrics.fields.length >= METRICS_MAX}>
              Thêm chỉ số
            </Button>
            {METRIC_SUGGESTIONS.filter((name) => !metricNames.includes(name.toLowerCase())).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addMetric(name)}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-primary/40 px-3 text-[13px] font-bold whitespace-nowrap text-primary-deep hover:bg-primary/5"
              >
                <Plus aria-hidden="true" /> {name}
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-base font-extrabold text-ink">3. Tùy chọn</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-score`} label="Điểm tổng" error={errors.score?.message} hint="Từ 0 đến 100">
            <input
              id={`${id}-score`}
              type="number"
              step="any"
              min={0}
              max={100}
              inputMode="decimal"
              className={inputClass}
              aria-invalid={errors.score ? true : undefined}
              aria-describedby={describedBy(`${id}-score`, { error: errors.score, hint: true })}
              {...form.register('score')}
            />
          </Field>
          <Field id={`${id}-next`} label="Ngày đánh giá tiếp theo" error={errors.nextAssessmentDate?.message}>
            <input
              id={`${id}-next`}
              type="date"
              min={assessmentDate ? addDays(assessmentDate, 1) : undefined}
              className={inputClass}
              aria-invalid={errors.nextAssessmentDate ? true : undefined}
              aria-describedby={describedBy(`${id}-next`, { error: errors.nextAssessmentDate })}
              {...form.register('nextAssessmentDate')}
            />
          </Field>
        </div>
        <Field id={`${id}-recommendation`} label="Khuyến nghị" error={errors.recommendation?.message}>
          <textarea
            id={`${id}-recommendation`}
            className={`${textareaClass} min-h-20`}
            placeholder="Ví dụ: Bơi thêm 2 buổi sức bền mỗi tuần"
            aria-invalid={errors.recommendation ? true : undefined}
            aria-describedby={describedBy(`${id}-recommendation`, { error: errors.recommendation })}
            {...form.register('recommendation')}
          />
        </Field>
      </Card>

      {formError && <InlineAlert>{formError}</InlineAlert>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          Lưu đánh giá
        </Button>
      </div>
    </form>
  );
}
