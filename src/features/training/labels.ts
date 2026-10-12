import type {
  AttendanceStatus,
  EnrollmentStatus,
  PlanAssignmentStatus,
  PlanLevel,
  PlanStatus,
  WorkoutPlanItem,
} from './types';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export const attendanceStatuses: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Có mặt',
  LATE: 'Muộn',
  ABSENT: 'Vắng',
  EXCUSED: 'Có phép',
};

export const attendanceStatusTones: Record<AttendanceStatus, Tone> = {
  PRESENT: 'success',
  LATE: 'warning',
  ABSENT: 'danger',
  EXCUSED: 'info',
};

export const planStatusLabels: Record<PlanStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang dùng',
  INACTIVE: 'Ngừng',
  ARCHIVED: 'Lưu trữ',
};

export const planStatusTones: Record<PlanStatus, Tone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  ARCHIVED: 'neutral',
};

export const planLevels: PlanLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const levelLabels: Record<PlanLevel, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
};

// level lưu dạng chuỗi trong DB: giá trị lạ thì hiển thị nguyên văn
export function levelLabel(level: string) {
  return levelLabels[level as PlanLevel] ?? level;
}

export const intensityOptions = [
  { value: 'LOW', label: 'Nhẹ' },
  { value: 'MEDIUM', label: 'Vừa' },
  { value: 'HIGH', label: 'Cao' },
] as const;

const intensityTones: Record<string, Tone> = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger' };

// intensity là chuỗi tự do ở backend; chỉ dịch các giá trị chuẩn
export function intensityLabel(intensity: string) {
  return intensityOptions.find((option) => option.value === intensity)?.label ?? intensity;
}

export function intensityTone(intensity: string): Tone {
  return intensityTones[intensity] ?? 'neutral';
}

export const assignmentStatusLabels: Record<PlanAssignmentStatus, string> = {
  ACTIVE: 'Đang áp dụng',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  ACTIVE: 'Đang học',
  COMPLETED: 'Đã hoàn thành',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

/** Thông số của một mục giáo án: "10 phút", "3 hiệp", "10 lần" */
export function itemSpecs(item: Pick<WorkoutPlanItem, 'durationMinutes' | 'sets' | 'repetitions'>) {
  const specs: string[] = [];
  if (item.sets) specs.push(`${item.sets} hiệp`);
  if (item.repetitions) specs.push(`${item.repetitions} lần`);
  if (item.durationMinutes) specs.push(`${item.durationMinutes} phút`);
  return specs;
}
