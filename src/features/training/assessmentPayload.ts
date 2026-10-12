import type { AssessmentFormOutput } from './schemas';
import type { AssessmentInput, TraineeContext } from './types';

export const METRIC_SUGGESTIONS = ['Cân nặng (kg)', 'Body fat (%)', 'Kỹ thuật (1–10)'];

// Backend chỉ cho đánh giá khóa 1-1 đang học hoặc đã học xong
const ASSESSABLE_ENROLLMENT = new Set(['ACTIVE', 'COMPLETED']);

/** Giá trị radio của ngữ cảnh: "GROUP_CLASS:31" hoặc "PRIVATE_COURSE:15" */
export function contextValue(context: TraineeContext) {
  return context.type === 'GROUP_CLASS' ? `GROUP_CLASS:${context.classRegistrationId}` : `PRIVATE_COURSE:${context.privateEnrollmentId}`;
}

export function isContextAssessable(context: TraineeContext) {
  return context.type === 'GROUP_CLASS' || ASSESSABLE_ENROLLMENT.has(context.status);
}

/** Đổi giá trị form thành payload POST /api/progress-assessments, gửi đúng MỘT ngữ cảnh (BR-46) */
export function toAssessmentInput(values: AssessmentFormOutput): AssessmentInput {
  const [type, rawId] = values.context.split(':');
  const contextId = Number(rawId);
  return {
    memberId: values.memberId,
    ...(type === 'GROUP_CLASS' ? { classRegistrationId: contextId } : { privateEnrollmentId: contextId }),
    assessmentDate: values.assessmentDate,
    coachComment: values.coachComment,
    metrics: Object.fromEntries(values.metrics.map((metric) => [metric.name.trim(), metric.value as number])),
    ...(values.score !== undefined && { score: values.score }),
    ...(values.recommendation && { recommendation: values.recommendation }),
    ...(values.nextAssessmentDate && { nextAssessmentDate: values.nextAssessmentDate }),
  };
}
