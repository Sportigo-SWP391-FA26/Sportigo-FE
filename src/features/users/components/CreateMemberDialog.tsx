import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { parseApiError } from '../../training/errors';
import { Button } from '../../training/components/ui/Button';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { InlineAlert } from '../../training/components/ui/States';
import { describedBy, inputClass } from '../../training/components/ui/styles';
import { useCreateMember } from '../hooks/useUsers';
import type { CreateMemberInput } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

// note: cùng rule với createMemberSchema bên backend
const memberSchema = z.object({
  displayName: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự').max(80, 'Họ tên tối đa 80 ký tự'),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  phone: z.string().trim().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'),
  dateOfBirth: z
    .string()
    .refine((value) => value === '' || (value >= '1900-01-01' && value <= today()), 'Ngày sinh phải từ 1900 đến hôm nay'),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']),
  emergencyContact: z.string().trim().max(100, 'Tối đa 100 ký tự'),
});
type MemberValues = z.infer<typeof memberSchema>;

type Props = { open: boolean; onClose: () => void };

// FR-08: Receptionist tạo tài khoản hội viên tại quầy
export function CreateMemberDialog({ open, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tạo hội viên"
      description="Mã hội viên do hệ thống sinh. Hội viên nhận mã OTP qua email để kích hoạt rồi tự đặt mật khẩu bằng chức năng Quên mật khẩu."
    >
      {open && <MemberForm onClose={onClose} />}
    </Dialog>
  );
}

function MemberForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const create = useCreateMember();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { displayName: '', email: '', phone: '', dateOfBirth: '', gender: '', emergencyContact: '' },
  });
  const { errors } = form.formState;

  const onSubmit = async (values: MemberValues) => {
    setFormError(null);
    // note: bỏ trường tùy chọn để trống, backend dùng .strict() và không nhận chuỗi rỗng
    const input: CreateMemberInput = {
      displayName: values.displayName,
      email: values.email,
      phone: values.phone,
      ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
      ...(values.gender ? { gender: values.gender } : {}),
      ...(values.emergencyContact ? { emergencyContact: values.emergencyContact } : {}),
    };
    try {
      const created = await create.mutateAsync(input);
      toast(
        created.emailSent
          ? `Đã tạo hội viên ${created.displayName} (${created.code}). Mã kích hoạt đã gửi tới ${created.email}.`
          : `Đã tạo hội viên ${created.displayName} (${created.code}) nhưng chưa gửi được email kích hoạt.`,
      );
      onClose();
    } catch (err) {
      const apiError = parseApiError(err);
      const field = (apiError.details as { field?: string } | undefined)?.field;
      // note: email/SĐT trùng thì báo ngay dưới ô tương ứng
      if (apiError.code === 'ACCOUNT_EXISTS' && (field === 'email' || field === 'phone')) {
        form.setError(field, { type: 'server', message: apiError.message }, { shouldFocus: true });
      } else {
        setFormError(apiError.message);
      }
    }
  };

  const fieldId = (name: Path<MemberValues>) => `${id}-${name}`;
  const aria = (name: Path<MemberValues>) => ({
    id: fieldId(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': describedBy(fieldId(name), { error: errors[name] }),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id={fieldId('displayName')} label="Họ tên" required error={errors.displayName?.message}>
        <input className={inputClass} autoComplete="off" {...aria('displayName')} {...form.register('displayName')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId('email')} label="Email" required error={errors.email?.message}>
          <input type="email" className={inputClass} autoComplete="off" {...aria('email')} {...form.register('email')} />
        </Field>
        <Field id={fieldId('phone')} label="Số điện thoại" required error={errors.phone?.message}>
          <input type="tel" className={inputClass} autoComplete="off" {...aria('phone')} {...form.register('phone')} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId('dateOfBirth')} label="Ngày sinh" error={errors.dateOfBirth?.message}>
          <input type="date" className={inputClass} max={today()} {...aria('dateOfBirth')} {...form.register('dateOfBirth')} />
        </Field>
        <Field id={fieldId('gender')} label="Giới tính">
          <select className={inputClass} {...aria('gender')} {...form.register('gender')}>
            <option value="">Không chọn</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </Field>
      </div>
      <Field id={fieldId('emergencyContact')} label="Liên hệ khẩn cấp" error={errors.emergencyContact?.message}>
        <input className={inputClass} autoComplete="off" {...aria('emergencyContact')} {...form.register('emergencyContact')} />
      </Field>

      {formError && <InlineAlert>{formError}</InlineAlert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
          Hủy
        </Button>
        <Button type="submit" loading={create.isPending}>
          Tạo hội viên
        </Button>
      </div>
    </form>
  );
}
