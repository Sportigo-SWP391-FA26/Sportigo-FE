import { z } from 'zod';
import { intensityOptions, planLevels } from './labels';
import { todayInCenter } from './format';

// Giới hạn khớp validate của backend (workout-plan.schema.ts, workout-plan-item.schema.ts, progress-assessment.schema.ts)

// Ô nhập/select trả về chuỗi: nhận cả số lẫn chuỗi rồi ép sang số
const numberInput = <T extends z.ZodTypeAny>(schema: T) => z.union([z.number(), z.string()]).pipe(schema);

const requiredNumber = (label: string, min: number, max: number) =>
  numberInput(
    z.coerce
      .number({ invalid_type_error: `${label} phải là số` })
      .int(`${label} phải là số nguyên`)
      .min(min, `${label} tối thiểu là ${min}`)
      .max(max, `${label} tối đa là ${max}`),
  );

// Ô số để trống → undefined (không gửi)
const optionalNumber = (label: string, min: number, max: number) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), requiredNumber(label, min, max).optional());

export const workoutPlanFormSchema = z.object({
  sportId: numberInput(z.coerce.number({ invalid_type_error: 'Vui lòng chọn môn' }).int().positive('Vui lòng chọn môn')),
  name: z.string().trim().min(2, 'Tên giáo án cần ít nhất 2 ký tự').max(160, 'Tên giáo án tối đa 160 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  level: z.enum(planLevels as [string, ...string[]], { errorMap: () => ({ message: 'Vui lòng chọn cấp độ' }) }),
  durationWeeks: requiredNumber('Số tuần', 1, 104),
});

export type WorkoutPlanFormValues = z.input<typeof workoutPlanFormSchema>;
export type WorkoutPlanFormOutput = z.output<typeof workoutPlanFormSchema>;

export const planItemFormSchema = z.object({
  weekNumber: requiredNumber('Tuần', 1, 104),
  sessionNumber: requiredNumber('Buổi', 1, 14),
  itemOrder: optionalNumber('Thứ tự', 1, 1000),
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(160, 'Tiêu đề tối đa 160 ký tự'),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung').max(5000, 'Nội dung tối đa 5000 ký tự'),
  durationMinutes: optionalNumber('Thời lượng', 1, 600),
  sets: optionalNumber('Số hiệp', 1, 100),
  repetitions: optionalNumber('Số lần', 1, 1000),
  intensity: z.union([z.enum(intensityOptions.map((option) => option.value) as [string, ...string[]]), z.literal('')]),
  note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự'),
});

export type PlanItemFormValues = z.input<typeof planItemFormSchema>;
export type PlanItemFormOutput = z.output<typeof planItemFormSchema>;

export const METRIC_NAME_MAX = 50;
export const METRICS_MAX = 30;

export const assessmentFormSchema = z
  .object({
    memberId: numberInput(z.coerce.number({ invalid_type_error: 'Vui lòng chọn học viên' }).int().positive('Vui lòng chọn học viên')),
    // "GROUP_CLASS:31" hoặc "PRIVATE_COURSE:15": một giá trị duy nhất nên chỉ chọn được đúng MỘT ngữ cảnh (BR-46)
    context: z.string().regex(/^(GROUP_CLASS|PRIVATE_COURSE):\d+$/, 'Vui lòng chọn đúng một ngữ cảnh đánh giá'),
    assessmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Vui lòng chọn ngày đánh giá')
      .refine((date) => date <= todayInCenter(), 'Ngày đánh giá không được ở tương lai'),
    coachComment: z.string().trim().min(1, 'Vui lòng nhập nhận xét').max(2000, 'Nhận xét tối đa 2000 ký tự'),
    metrics: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Nhập tên chỉ số').max(METRIC_NAME_MAX, `Tên chỉ số tối đa ${METRIC_NAME_MAX} ký tự`),
          value: z.preprocess(
            (value) => (value === '' || value === null ? undefined : value),
            z.coerce.number({ required_error: 'Nhập giá trị', invalid_type_error: 'Giá trị phải là số' }),
          ),
        }),
      )
      .min(1, 'Cần ít nhất một chỉ số')
      .max(METRICS_MAX, `Tối đa ${METRICS_MAX} chỉ số`)
      .superRefine((metrics, context) => {
        const seen = new Map<string, number>();
        metrics.forEach((metric, index) => {
          const key = metric.name.trim().toLowerCase();
          if (!key) return;
          if (seen.has(key)) {
            context.addIssue({ code: 'custom', path: [index, 'name'], message: 'Tên chỉ số bị trùng' });
          }
          seen.set(key, index);
        });
      }),
    score: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number({ invalid_type_error: 'Điểm phải là số' }).min(0, 'Điểm từ 0 đến 100').max(100, 'Điểm từ 0 đến 100').optional(),
    ),
    recommendation: z.string().trim().max(2000, 'Khuyến nghị tối đa 2000 ký tự'),
    nextAssessmentDate: z.string(),
  })
  .refine((data) => !data.nextAssessmentDate || data.nextAssessmentDate > data.assessmentDate, {
    path: ['nextAssessmentDate'],
    message: 'Ngày đánh giá tiếp theo phải sau ngày đánh giá',
  });

export type AssessmentFormValues = z.input<typeof assessmentFormSchema>;
export type AssessmentFormOutput = z.output<typeof assessmentFormSchema>;
