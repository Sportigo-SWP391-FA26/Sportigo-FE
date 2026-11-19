import type { AppRole } from '../../components/auth/session';
import type { Tone } from '../training/labels';
import type { UserStatus } from './types';

export const roleOptions: readonly { value: AppRole; label: string }[] = [
  { value: 'CENTER_MANAGER', label: 'Center Manager' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'COACH', label: 'Coach' },
  { value: 'MEMBER', label: 'Member' },
];

export const statusOptions: readonly { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
  { value: 'INACTIVE', label: 'Chưa kích hoạt' },
];

export function roleLabel(role: AppRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

export function statusLabel(status: UserStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

const statusTones: Record<UserStatus, Tone> = {
  ACTIVE: 'success',
  LOCKED: 'danger',
  INACTIVE: 'neutral',
};

export function statusTone(status: UserStatus): Tone {
  return statusTones[status] ?? 'neutral';
}
