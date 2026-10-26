import type { UserStatus } from '../users/types';

export type StaffRole = 'COACH' | 'RECEPTIONIST';
export type CoachStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

// Khớp response /api/staff (Sportigo-BE/src/modules/users/staff.service.ts → toStaff)
export type StaffMember = {
  id: number;
  email: string;
  phone: string | null;
  displayName: string;
  role: StaffRole;
  status: UserStatus;
  emailVerified: boolean;
  staffCode: string | null;
  /** YYYY-MM-DD */
  hiredAt: string | null;
  bio: string | null;
  coachStatus: CoachStatus | null;
  createdAt: string;
};

export type StaffListQuery = {
  q?: string;
  role?: StaffRole;
  page: number;
  pageSize: number;
};

export type StaffListPage = {
  items: StaffMember[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateStaffInput = {
  role: StaffRole;
  staffCode: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
  hiredAt?: string;
  bio?: string;
};

export type UpdateStaffInput = Partial<{
  staffCode: string;
  displayName: string;
  phone: string;
  hiredAt: string | null;
  bio: string | null;
  coachStatus: CoachStatus;
}>;
