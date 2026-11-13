import type { Tone } from '../training/labels';
import type { CoachStatus, StaffRole } from './types';

export const staffRoleOptions: readonly { value: StaffRole; label: string }[] = [
  { value: 'COACH', label: 'Coach' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
];

export const coachStatusOptions: readonly { value: CoachStatus; label: string; tone: Tone }[] = [
  { value: 'ACTIVE', label: 'Đang làm việc', tone: 'success' },
  { value: 'ON_LEAVE', label: 'Tạm nghỉ', tone: 'warning' },
  { value: 'INACTIVE', label: 'Ngừng làm việc', tone: 'neutral' },
];

export const staffRoleLabel = (role: StaffRole) => staffRoleOptions.find((option) => option.value === role)?.label ?? role;
export const coachStatusOption = (status: CoachStatus) => coachStatusOptions.find((option) => option.value === status);
