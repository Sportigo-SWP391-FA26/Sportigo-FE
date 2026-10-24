import type { AppRole } from '../../components/auth/session';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Khớp response GET/PATCH /api/users/me (users.service.ts → toProfile)
export type MyProfile = {
  id: number;
  email: string;
  phone: string | null;
  displayName: string;
  role: AppRole;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  emailVerifiedAt: string | null;
  createdAt: string;
  member: {
    memberCode: string;
    dateOfBirth: string | null; // "YYYY-MM-DD"
    gender: Gender | null;
    emergencyContact: string | null;
    joinedAt: string;
  } | null;
  coach: {
    coachCode: string;
    bio: string | null;
    hiredAt: string | null; // "YYYY-MM-DD"
  } | null;
};

// Body PATCH /api/users/me: chỉ gửi trường đã đổi; null để xóa trường không bắt buộc
export type UpdateProfileInput = Partial<{
  displayName: string;
  phone: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  emergencyContact: string | null;
  bio: string | null;
}>;

// Body và response PUT /api/users/me/password (FR-62)
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResponse = { message: string; accessToken: string };

// Nhóm trường hiển thị trên form, suy ra từ bản ghi Member/Coach giống backend
export type ProfileKind = 'member' | 'coach' | 'staff';

export function profileKind(profile: MyProfile): ProfileKind {
  if (profile.member) return 'member';
  if (profile.coach) return 'coach';
  return 'staff';
}
