import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState, type ReactNode } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from '../../../components/feedback/toast';
// note: bộ UI và xử lý lỗi đang nằm trong feature training; khi chuyển ra src/components thì đổi đường dẫn import
import { applyFieldErrors, parseApiError } from '../../training/errors';
import { Button } from '../../training/components/ui/Button';
import { Field } from '../../training/components/ui/Field';
import { InlineAlert } from '../../training/components/ui/States';
import {
  describedBy,
  inputClass,
  textareaClass,
} from '../../training/components/ui/styles';
import { useUpdateMyProfile } from '../hooks/useMyProfile';
import { EmailChangeDialog } from './EmailChangeDialog';
import {
  genderOptions,
  PROFILE_FIELDS,
  profileSchemaFor,
  toFormValues,
  toUpdateInput,
  type ProfileFormValues,
} from '../schema';
import { profileKind, type MyProfile } from '../types';

const roleLabels: Record<MyProfile['role'], string> = {
  CENTER_MANAGER: 'Center Manager',
  RECEPTIONIST: 'Receptionist',
  COACH: 'Coach',
  MEMBER: 'Member',
};

const statusLabels: Record<MyProfile['status'], string> = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
  INACTIVE: 'Chưa kích hoạt',
};

type Props = { profile: MyProfile };

export function ProfileForm({ profile }: Props) {
  const id = useId();
  const kind = profileKind(profile);
  const update = useUpdateMyProfile();
  const [formError, setFormError] = useState<string | null>(null);
  // note: FR-05 bật/tắt hộp thoại đổi email
  const [changingEmail, setChangingEmail] = useState(false);

  const form = useForm<ProfileFormValues>({
    // note: schema đổi theo role nên mỗi role chỉ validate đúng nhóm trường của mình
    resolver: zodResolver(
      profileSchemaFor(kind),
    ) as Resolver<ProfileFormValues>,
    defaultValues: toFormValues(profile),
  });
  const { errors, isDirty, dirtyFields } = form.formState;

  const onSubmit = async (values: ProfileFormValues) => {
    setFormError(null);
    const input = toUpdateInput(values, dirtyFields);
    if (Object.keys(input).length === 0) return;
    try {
      const updated = await update.mutateAsync(input);
      // note: reset với dữ liệu server trả về → form hết "dirty", nút Lưu bị khóa lại
      form.reset(toFormValues(updated));
      toast('Đã cập nhật hồ sơ.');
    } catch (error) {
      const apiError = parseApiError(error);
      // note: 409 ACCOUNT_EXISTS có details.field (hiện chỉ phone) → gắn lỗi vào đúng ô thay vì báo chung
      const conflictField = (apiError.details as { field?: string } | undefined)
        ?.field;
      if (apiError.code === 'ACCOUNT_EXISTS' && conflictField === 'phone') {
        form.setError(
          'phone',
          { type: 'server', message: apiError.message },
          { shouldFocus: true },
        );
        return;
      }
      // 422 từ backend: map fieldErrors vào ô tương ứng; lỗi còn lại (vd. 400 FIELD_NOT_ALLOWED) hiện dưới form
      if (!applyFieldErrors(form.setError, apiError, PROFILE_FIELDS))
        setFormError(apiError.message);
    }
  };

  const textInput = (
    name: 'displayName' | 'phone' | 'emergencyContact',
    label: string,
    options: {
      required?: boolean;
      type?: string;
      placeholder?: string;
      hint?: string;
    } = {},
  ) => (
    <Field
      id={`${id}-${name}`}
      label={label}
      required={options.required}
      error={errors[name]?.message}
      hint={options.hint}
    >
      <input
        id={`${id}-${name}`}
        type={options.type ?? 'text'}
        className={inputClass}
        placeholder={options.placeholder}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={describedBy(`${id}-${name}`, {
          error: errors[name],
          hint: options.hint,
        })}
        {...form.register(name)}
      />
    </Field>
  );

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        {/* note: email, role, trạng thái và mã chỉ hiển thị; backend cũng từ chối các trường này (422) */}
        <dl className="grid gap-3 rounded-xl border border-line bg-canvas p-4 text-sm sm:grid-cols-2">
          {/* note: FR-05 email không sửa trực tiếp trong form, phải qua hộp thoại đổi email có xác minh OTP */}
          <ReadOnly
            label="Email"
            value={profile.email}
            action={
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => setChangingEmail(true)}
              >
                Đổi email
              </button>
            }
          />
          <ReadOnly
            label="Vai trò"
            value={roleLabels[profile.role] ?? profile.role}
          />
          <ReadOnly
            label="Trạng thái"
            value={statusLabels[profile.status] ?? profile.status}
          />
          {profile.member && (
            <ReadOnly label="Mã hội viên" value={profile.member.memberCode} />
          )}
          {profile.coach && (
            <ReadOnly label="Mã Coach" value={profile.coach.coachCode} />
          )}
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          {textInput('displayName', 'Họ tên', { required: true })}
          {textInput('phone', 'Số điện thoại', {
            required: true,
            type: 'tel',
            placeholder: '0912345678',
            hint: 'Bắt đầu bằng 0 hoặc +84.',
          })}
        </div>

        {kind === 'member' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${id}-dateOfBirth`}
              label="Ngày sinh"
              error={errors.dateOfBirth?.message}
            >
              <input
                id={`${id}-dateOfBirth`}
                type="date"
                min="1900-01-01"
                className={inputClass}
                aria-invalid={errors.dateOfBirth ? true : undefined}
                aria-describedby={describedBy(`${id}-dateOfBirth`, {
                  error: errors.dateOfBirth,
                })}
                {...form.register('dateOfBirth')}
              />
            </Field>
            <Field
              id={`${id}-gender`}
              label="Giới tính"
              error={errors.gender?.message}
            >
              <select
                id={`${id}-gender`}
                className={inputClass}
                aria-invalid={errors.gender ? true : undefined}
                aria-describedby={describedBy(`${id}-gender`, {
                  error: errors.gender,
                })}
                {...form.register('gender')}
              >
                <option value="">Không muốn cho biết</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              {textInput('emergencyContact', 'Liên hệ khẩn cấp', {
                placeholder: 'Tên và số điện thoại người thân',
              })}
            </div>
            <div className="sm:col-span-2">
              <Field
                id={`${id}-trainingGoal`}
                label="Mục tiêu tập luyện"
                error={errors.trainingGoal?.message}
                hint="Coach phụ trách sẽ dùng mục tiêu này để chuẩn bị giáo án phù hợp."
              >
                <textarea
                  id={`${id}-trainingGoal`}
                  className={textareaClass}
                  placeholder="Ví dụ: Bơi liên tục 1.000 m sau 3 tháng"
                  aria-invalid={errors.trainingGoal ? true : undefined}
                  aria-describedby={describedBy(`${id}-trainingGoal`, {
                    error: errors.trainingGoal,
                    hint: true,
                  })}
                  {...form.register('trainingGoal')}
                />
              </Field>
            </div>
          </div>
        )}

        {kind === 'coach' && (
          <Field
            id={`${id}-bio`}
            label="Giới thiệu"
            error={errors.bio?.message}
            hint="Hiển thị cho học viên khi chọn Coach."
          >
            <textarea
              id={`${id}-bio`}
              className={textareaClass}
              aria-invalid={errors.bio ? true : undefined}
              aria-describedby={describedBy(`${id}-bio`, {
                error: errors.bio,
                hint: true,
              })}
              {...form.register('bio')}
            />
          </Field>
        )}

        {formError && <InlineAlert>{formError}</InlineAlert>}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => form.reset()}
            disabled={!isDirty || update.isPending}
          >
            Hoàn tác
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
      {/* note: đặt hộp thoại NGOÀI form hồ sơ vì Dialog không dùng portal, form lồng form sẽ submit nhầm */}
      <EmailChangeDialog
        open={changingEmail}
        currentEmail={profile.email}
        onClose={() => setChangingEmail(false)}
      />
    </>
  );
}

// note: action (tùy chọn) là nút nhỏ cạnh nhãn, hiện dùng cho "Đổi email" (FR-05)
function ReadOnly({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-semibold text-muted">
        {label}
        {action}
      </dt>
      <dd className="mt-0.5 truncate font-bold text-ink">{value}</dd>
    </div>
  );
}
