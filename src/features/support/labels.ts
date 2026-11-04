import type { Tone } from '../training/labels';
import type { SupportCategory, SupportPriority, SupportStatus } from './types';

export const categoryOptions: readonly { value: SupportCategory; label: string }[] = [
  { value: 'ACCOUNT', label: 'Tài khoản' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'CLASS', label: 'Lớp học' },
  { value: 'PRIVATE_COURSE', label: 'Khóa 1–1' },
  { value: 'FACILITY', label: 'Cơ sở vật chất' },
  { value: 'OTHER', label: 'Khác' },
];

export const priorityOptions: readonly { value: SupportPriority; label: string; tone: Tone }[] = [
  { value: 'LOW', label: 'Thấp', tone: 'neutral' },
  { value: 'MEDIUM', label: 'Trung bình', tone: 'info' },
  { value: 'HIGH', label: 'Cao', tone: 'warning' },
  { value: 'URGENT', label: 'Khẩn cấp', tone: 'danger' },
];

export const statusOptions: readonly { value: SupportStatus; label: string; tone: Tone }[] = [
  { value: 'OPEN', label: 'Mới gửi', tone: 'info' },
  { value: 'ASSIGNED', label: 'Đã tiếp nhận', tone: 'primary' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý', tone: 'warning' },
  { value: 'RESOLVED', label: 'Đã giải quyết', tone: 'success' },
  { value: 'CLOSED', label: 'Đã đóng', tone: 'neutral' },
  { value: 'CANCELLED', label: 'Đã hủy', tone: 'neutral' },
];

export const categoryLabel = (value: SupportCategory) => categoryOptions.find((option) => option.value === value)?.label ?? value;
export const priorityOption = (value: SupportPriority) => priorityOptions.find((option) => option.value === value) ?? priorityOptions[1];
export const statusOption = (value: SupportStatus) => statusOptions.find((option) => option.value === value) ?? statusOptions[0];

// note: cùng quy tắc với backend (FINISHED_STATUSES, MEMBER_CANCELLABLE)
export const isFinished = (status: SupportStatus) => status === 'CLOSED' || status === 'CANCELLED';
export const memberCanCancel = (status: SupportStatus) => status === 'OPEN' || status === 'ASSIGNED' || status === 'IN_PROGRESS';

// FR-56: nút chuyển trạng thái cho nhân viên, khớp TRANSITIONS trong support-staff.service.ts
export const staffTransitions: Partial<Record<SupportStatus, { to: 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; label: string; primary?: boolean }[]>> = {
  ASSIGNED: [{ to: 'IN_PROGRESS', label: 'Bắt đầu xử lý', primary: true }],
  IN_PROGRESS: [{ to: 'RESOLVED', label: 'Đánh dấu đã giải quyết', primary: true }],
  RESOLVED: [
    { to: 'CLOSED', label: 'Đóng yêu cầu', primary: true },
    { to: 'IN_PROGRESS', label: 'Mở lại' },
  ],
};

export const canAssign = (status: SupportStatus) => status === 'OPEN' || status === 'ASSIGNED' || status === 'IN_PROGRESS';
