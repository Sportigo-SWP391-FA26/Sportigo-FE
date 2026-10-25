import { z } from 'zod';
import type { Gender, MyProfile, ProfileKind, UpdateProfileInput } from './types';

// Giới hạn khớp updateProfileSchema của backend (Sportigo-BE/src/modules/users/users.schema.ts)

export const genderOptions: readonly { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const baseSchema = z.object({
  displayName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(80, 'Họ tên tối đa 80 ký tự'),
  // note: cùng regex với form đăng ký và backend; bắt buộc vì phone là định danh đăng nhập
  phone: z.string().trim().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'),
});

const memberSchema = baseSchema.extend({
  // note: ô date trả "" khi để trống → hợp lệ, sẽ gửi null; có giá trị thì phải trong 1900 → hôm nay
  dateOfBirth: z
    .string()
    .refine((value) => value === '' || (value >= '1900-01-01' && value <= todayIso()), 'Ngày sinh phải từ 1900 đến hôm nay'),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']),
  emergencyContact: z.string().trim().max(100, 'Liên hệ khẩn cấp tối đa 100 ký tự'),
});

const coachSchema = baseSchema.extend({
  bio: z.string().trim().max(1000, 'Giới thiệu tối đa 1000 ký tự'),
});

// note: strict để form không thể mang theo trường lạ (email, role...) dù ai đó sửa defaultValues
const schemas = {
  member: memberSchema.strict(),
  coach: coachSchema.strict(),
  staff: baseSchema.strict(),
} as const;

export function profileSchemaFor(kind: ProfileKind) {
  return schemas[kind];
}

// Gộp mọi trường để một kiểu dùng chung cho cả 3 form; trường không thuộc role sẽ không được render
export type ProfileFormValues = {
  displayName: string;
  phone: string;
  dateOfBirth?: string;
  gender?: Gender | '';
  emergencyContact?: string;
  bio?: string;
};

export const PROFILE_FIELDS = ['displayName', 'phone', 'dateOfBirth', 'gender', 'emergencyContact', 'bio'] as const;

export function toFormValues(profile: MyProfile): ProfileFormValues {
  const base = { displayName: profile.displayName, phone: profile.phone ?? '' };
  if (profile.member) {
    return {
      ...base,
      dateOfBirth: profile.member.dateOfBirth ?? '',
      gender: profile.member.gender ?? '',
      emergencyContact: profile.member.emergencyContact ?? '',
    };
  }
  if (profile.coach) return { ...base, bio: profile.coach.bio ?? '' };
  return base;
}

// ---------- FR-62: đổi mật khẩu ----------

// note: không trim mật khẩu vì khoảng trắng là một phần của mật khẩu; 8–72 khớp backend (bcrypt dùng tối đa 72 byte)
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự').max(72, 'Mật khẩu mới tối đa 72 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .strict()
  // note: chỉ so chuỗi khi đã nhập mật khẩu hiện tại; backend vẫn so với hash và trả SAME_AS_CURRENT_PASSWORD
  .refine((data) => !data.currentPassword || data.newPassword !== data.currentPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

// note: chỉ gửi trường đã đổi; chuỗi rỗng ở trường không bắt buộc → null để backend xóa giá trị
export function toUpdateInput(values: ProfileFormValues, dirty: Partial<Record<keyof ProfileFormValues, unknown>>): UpdateProfileInput {
  const input: UpdateProfileInput = {};
  if (dirty.displayName) input.displayName = values.displayName.trim();
  if (dirty.phone) input.phone = values.phone.trim();
  if (dirty.dateOfBirth && values.dateOfBirth !== undefined) input.dateOfBirth = values.dateOfBirth || null;
  if (dirty.gender && values.gender !== undefined) input.gender = values.gender || null;
  if (dirty.emergencyContact && values.emergencyContact !== undefined) input.emergencyContact = values.emergencyContact.trim() || null;
  if (dirty.bio && values.bio !== undefined) input.bio = values.bio.trim() || null;
  return input;
}
