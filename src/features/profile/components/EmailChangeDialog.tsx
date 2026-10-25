import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { applyFieldErrors, parseApiError } from '../../training/errors';
import { Button } from '../../training/components/ui/Button';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { InlineAlert } from '../../training/components/ui/States';
import { describedBy, inputClass } from '../../training/components/ui/styles';
import {
  useConfirmEmailChange,
  useRequestEmailChange,
} from '../hooks/useMyProfile';
import type { EmailChangeInput } from '../types';

// note: cùng rule với emailChangeSchema / confirmEmailChangeSchema bên backend
const requestSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
});
const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Mã OTP gồm đúng 6 chữ số'),
});

type Props = { open: boolean; currentEmail: string; onClose: () => void };

// FR-05: đổi email 2 bước – nhập email mới + mật khẩu → nhập OTP gửi tới email mới
export function EmailChangeDialog({ open, currentEmail, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Đổi email đăng nhập"
      description={`Email hiện tại: ${currentEmail}`}
    >
      {/* note: chỉ render khi mở để mỗi lần mở lại đều bắt đầu từ bước 1 với form trống */}
      {open && (
        <EmailChangeSteps currentEmail={currentEmail} onClose={onClose} />
      )}
    </Dialog>
  );
}

function EmailChangeSteps({
  currentEmail,
  onClose,
}: {
  currentEmail: string;
  onClose: () => void;
}) {
  // note: lưu lại email + mật khẩu đã gửi ở bước 1 để nút "Gửi lại mã" không bắt nhập lại
  const [sent, setSent] = useState<EmailChangeInput | null>(null);
  return sent ? (
    <CodeStep request={sent} onBack={() => setSent(null)} onDone={onClose} />
  ) : (
    <RequestStep
      currentEmail={currentEmail}
      onSent={setSent}
      onCancel={onClose}
    />
  );
}

function RequestStep({
  currentEmail,
  onSent,
  onCancel,
}: {
  currentEmail: string;
  onSent: (input: EmailChangeInput) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const request = useRequestEmailChange();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });
  const { errors } = form.formState;

  const onSubmit = async (values: z.infer<typeof requestSchema>) => {
    setFormError(null);
    // note: chặn sớm ở FE cho đỡ một lần gọi API; backend vẫn kiểm tra lại (SAME_AS_CURRENT_EMAIL)
    if (values.newEmail === currentEmail.toLowerCase()) {
      form.setError('newEmail', {
        type: 'manual',
        message: 'Email mới phải khác email hiện tại',
      });
      return;
    }
    try {
      await request.mutateAsync(values);
      onSent(values);
    } catch (err) {
      const apiError = parseApiError(err);
      // note: map mã lỗi backend vào đúng ô nhập để người dùng biết sửa chỗ nào
      const applied = applyFieldErrors(
        form.setError,
        apiError,
        ['newEmail', 'currentPassword'],
        {
          INVALID_CURRENT_PASSWORD: 'currentPassword',
          SAME_AS_CURRENT_EMAIL: 'newEmail',
          ACCOUNT_EXISTS: 'newEmail',
        },
      );
      if (!applied) setFormError(apiError.message);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
    >
      <Field
        id={`${id}-newEmail`}
        label="Email mới"
        required
        error={errors.newEmail?.message}
      >
        <input
          id={`${id}-newEmail`}
          type="email"
          autoComplete="email"
          className={inputClass}
          aria-invalid={errors.newEmail ? true : undefined}
          aria-describedby={describedBy(`${id}-newEmail`, {
            error: errors.newEmail,
          })}
          {...form.register('newEmail')}
        />
      </Field>
      <Field
        id={`${id}-currentPassword`}
        label="Mật khẩu hiện tại"
        required
        error={errors.currentPassword?.message}
      >
        <input
          id={`${id}-currentPassword`}
          type="password"
          autoComplete="current-password"
          className={inputClass}
          aria-invalid={errors.currentPassword ? true : undefined}
          aria-describedby={describedBy(`${id}-currentPassword`, {
            error: errors.currentPassword,
          })}
          {...form.register('currentPassword')}
        />
      </Field>
      {formError && <InlineAlert>{formError}</InlineAlert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={request.isPending}
        >
          Hủy
        </Button>
        <Button type="submit" loading={request.isPending}>
          Gửi mã xác nhận
        </Button>
      </div>
    </form>
  );
}

function CodeStep({
  request: sent,
  onBack,
  onDone,
}: {
  request: EmailChangeInput;
  onBack: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const confirm = useConfirmEmailChange();
  const resend = useRequestEmailChange();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });
  const { errors } = form.formState;

  const onSubmit = async ({ code }: z.infer<typeof codeSchema>) => {
    setFormError(null);
    try {
      const profile = await confirm.mutateAsync(code);
      toast(`Đã đổi email đăng nhập thành ${profile.email}.`);
      onDone();
    } catch (err) {
      const apiError = parseApiError(err);
      // note: mã sai/hết hạn gắn vào ô OTP; lỗi khác (email vừa bị người khác lấy) báo chung
      if (
        !applyFieldErrors(form.setError, apiError, ['code'], {
          INVALID_EMAIL_CHANGE_CODE: 'code',
        })
      )
        setFormError(apiError.message);
    }
  };

  // note: gửi lại dùng đúng email + mật khẩu ở bước 1; backend hủy mã cũ và tạo mã mới
  const handleResend = async () => {
    setFormError(null);
    try {
      await resend.mutateAsync(sent);
      form.reset({ code: '' });
      toast(`Đã gửi lại mã tới ${sent.newEmail}.`);
    } catch (err) {
      setFormError(parseApiError(err).message);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
    >
      <p className="text-sm text-ink">
        Mã OTP 6 số đã được gửi tới <strong>{sent.newEmail}</strong>. Mã có hiệu
        lực trong 10 phút.
      </p>
      <Field
        id={`${id}-code`}
        label="Mã OTP"
        required
        error={errors.code?.message}
      >
        <input
          id={`${id}-code`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={`${inputClass} tracking-[0.4em]`}
          aria-invalid={errors.code ? true : undefined}
          aria-describedby={describedBy(`${id}-code`, { error: errors.code })}
          {...form.register('code')}
        />
      </Field>
      {formError && <InlineAlert>{formError}</InlineAlert>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          className="font-semibold text-primary hover:underline disabled:opacity-60"
          onClick={handleResend}
          disabled={resend.isPending}
        >
          {resend.isPending ? 'Đang gửi lại…' : 'Gửi lại mã'}
        </button>
        <button
          type="button"
          className="font-semibold text-muted hover:underline"
          onClick={onBack}
        >
          Dùng email khác
        </button>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onDone}
          disabled={confirm.isPending}
        >
          Hủy
        </Button>
        <Button type="submit" loading={confirm.isPending}>
          Xác nhận đổi email
        </Button>
      </div>
    </form>
  );
}
