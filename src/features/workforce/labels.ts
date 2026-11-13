import { addDays } from '../training/format';
import type { Tone } from '../training/labels';
import type { AdjustmentStatus, ShiftAttendance } from './types';

// FR-67: nhãn và màu tình trạng chấm công
export const attendanceLabels: Record<ShiftAttendance, { label: string; tone: Tone }> = {
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  UPCOMING: { label: 'Sắp tới', tone: 'info' },
  NOT_CLOCKED_IN: { label: 'Chưa vào ca', tone: 'warning' },
  WORKING: { label: 'Đang làm', tone: 'primary' },
  MISSING_CLOCK_OUT: { label: 'Quên ra ca', tone: 'warning' },
  ABSENT: { label: 'Vắng', tone: 'danger' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
};

export const adjustmentLabels: Record<AdjustmentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
};

// note: 135 phút → "2 giờ 15 phút"
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

// note: chuyển một khoảng tuần sang trước/sau n ngày
export const shiftRange = (range: { from: string; to: string }, days: number) => ({ from: addDays(range.from, days), to: addDays(range.to, days) });
