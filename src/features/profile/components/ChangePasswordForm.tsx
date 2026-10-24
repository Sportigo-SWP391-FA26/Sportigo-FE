import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
// note: bộ UI và xử lý lỗi đang nằm trong feature training (giống ProfileForm); khi chuyển ra src/components thì đổi import
import { applyFieldErrors, parseApiError } from '../../training/errors';
import { Button } from '../../training/components/ui/Button';
import { Field } from '../../training/components/ui/Field';
import { InlineAlert } from '../../training/components/ui/States';
import { describedBy, inputClass } from '../../training/components/ui/styles';
import { useChangePassword } from '../hooks/useMyProfile';
import { changePasswordSchema, PASSWORD_FIELDS, type ChangePasswordFormValues } from '../schema';

const EMPTY: ChangePasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

type PasswordField = (typeof PASSWORD_FIELDS)[number];

// FR-62: đổi mật khẩu khi đang đăng nhập
export function ChangePasswordForm() {
  const id = useId();
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setFormError(null);
    try {
      const result = await change.mutateAsync(values);
      // note: xóa cả 3 ô để mật khẩu không nằm lại trên màn hình
      form.reset(EMPTY);
      toast(result.message || 'Đã đổi mật khẩu.');
    } catch (error) {
      const apiError = parseApiError(error);
      // note: lỗi nghiệp vụ 400 không có fieldErrors → gắn theo code; 422 có details.fieldErrors → gắn theo tên trường
      const applied = applyFieldErrors(form.setError, apiError, PASSWORD_FIELDS, {
        INVALID_CURRENT_PASSWORD: 'currentPassword',
        SAME_AS_CURRENT_PASSWORD: 'newPassword',
      });
      if (!applied) setFormError(apiError.message);
    }
  };

  const passwordInput = (name: PasswordField, label: string, autoComplete: string, hint?: string) => (
    <Field id={`${id}-${name}`} label={label} required error={errors[name]?.message} hint={hint}>
      <input
        id={`${id}-${name}`}
        type="password"
        // note: autoComplete đúng chuẩn để trình quản lý mật khẩu điền mật khẩu cũ và đề xuất mật khẩu mới
        autoComplete={autoComplete}
        className={inputClass}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={describedBy(`${id}-${name}`, { error: errors[name], hint })}
        {...form.register(name)}
      />
    </Field>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* note: API hồ sơ chưa cho biết tài khoản có tạo từ Google hay không, nên ghi chú luôn hiển thị */}
      <InlineAlert tone="info">
        Đăng nhập bằng Google và chưa từng đặt mật khẩu? Hãy dùng{' '}
        <Link to="/forgot-password" className="font-bold underline">
          Quên mật khẩu
        </Link>{' '}
        để đặt mật khẩu lần đầu qua mã OTP gửi tới email.
      </InlineAlert>

      {passwordInput('currentPassword', 'Mật khẩu hiện tại', 'current-password')}
      {passwordInput('newPassword', 'Mật khẩu mới', 'new-password', 'Từ 8 đến 72 ký tự, khác mật khẩu hiện tại.')}
      {passwordInput('confirmPassword', 'Nhập lại mật khẩu mới', 'new-password')}

      {formError && <InlineAlert>{formError}</InlineAlert>}

      <p className="text-xs leading-relaxed text-muted">
        Sau khi đổi, các thiết bị khác sẽ bị đăng xuất; thiết bị này vẫn giữ đăng nhập.
      </p>

      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" loading={change.isPending}>
          Đổi mật khẩu
        </Button>
      </div>
    </form>
  );
}
