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
import { describedBy, textareaClass } from '../../training/components/ui/styles';
import { useChangeUserStatus } from '../hooks/useUsers';
import type { UserSummary } from '../types';

// note: cùng giới hạn với changeUserStatusSchema bên backend
const reasonSchema = z.object({
  reason: z.string().trim().min(3, 'Lý do cần ít nhất 3 ký tự').max(500, 'Lý do tối đa 500 ký tự'),
});
type ReasonValues = z.infer<typeof reasonSchema>;

type Props = {
  user: UserSummary | null;
  onClose: () => void;
};

// FR-06: hộp xác nhận khóa / mở khóa, bắt buộc nhập lý do
export function UserStatusDialog({ user, onClose }: Props) {
  const locking = user?.status !== 'LOCKED';
  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      size="sm"
      title={locking ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
      description={
        user &&
        (locking
          ? `${user.displayName} sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi được mở khóa.`
          : `${user.displayName} sẽ đăng nhập lại được.`)
      }
    >
      {/* note: key theo id để form trống lại mỗi lần mở cho người khác */}
      {user && <ReasonForm key={user.id} user={user} locking={locking} onClose={onClose} />}
    </Dialog>
  );
}

function ReasonForm({ user, locking, onClose }: { user: UserSummary; locking: boolean; onClose: () => void }) {
  const id = useId();
  const change = useChangeUserStatus();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ReasonValues>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });
  const error = form.formState.errors.reason;

  const onSubmit = async ({ reason }: ReasonValues) => {
    setFormError(null);
    try {
      await change.mutateAsync({ userId: user.id, input: { status: locking ? 'LOCKED' : 'ACTIVE', reason } });
      toast(locking ? `Đã khóa tài khoản ${user.displayName}.` : `Đã mở khóa tài khoản ${user.displayName}.`);
      onClose();
    } catch (err) {
      const apiError = parseApiError(err);
      if (!applyFieldErrors(form.setError, apiError, ['reason'])) setFormError(apiError.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id={`${id}-reason`} label="Lý do" required error={error?.message} hint="Lý do được lưu vào Audit Log.">
        <textarea
          id={`${id}-reason`}
          className={textareaClass}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(`${id}-reason`, { error, hint: true })}
          {...form.register('reason')}
        />
      </Field>
      {formError && <InlineAlert>{formError}</InlineAlert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={change.isPending}>
          Hủy
        </Button>
        <Button type="submit" variant={locking ? 'danger' : 'primary'} loading={change.isPending}>
          {locking ? 'Khóa tài khoản' : 'Mở khóa'}
        </Button>
      </div>
    </form>
  );
}
