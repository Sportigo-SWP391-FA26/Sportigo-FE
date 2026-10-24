import type { AppRole } from '../../components/auth/session';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

// Khớp response GET /api/users (Sportigo-BE/src/modules/users/user-admin.service.ts → toUserSummary)
export type UserSummary = {
  id: number;
  email: string;
  phone: string | null;
  displayName: string;
  role: AppRole;
  status: UserStatus;
  /** Mã hội viên hoặc mã Coach */
  code: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export type UserListQuery = {
  q?: string;
  role?: AppRole;
  status?: UserStatus;
  page: number;
  pageSize: number;
};

export type UserListPage = {
  items: UserSummary[];
  page: number;
  pageSize: number;
  total: number;
};
