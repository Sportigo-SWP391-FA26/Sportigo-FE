import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { applyFieldErrors, parseApiError } from '../../training/errors';
import { Button } from '../../training/components/ui/Button';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { InlineAlert } from '../../training/components/ui/States';
import { describedBy, inputClass, textareaClass } from '../../training/components/ui/styles';
import { useCreateStaff, useUpdateStaff } from '../hooks/useStaff';
import { coachStatusOptions, staffRoleLabel, staffRoleOptions } from '../labels';
import type { CoachStatus, StaffMember, UpdateStaffInput } from '../types';

// note: cùng rule với staff.schema.ts bên backend
const baseSchema = z.object({
  staffCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,30}$/, 'Mã nhân sự gồm 3–30 ký tự chữ, số hoặc dấu gạch ngang'),
  displayName: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự').max(80, 'Họ tên tối đa 80 ký tự'),
  phone: z.string().trim().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'),
  hiredAt: z.string(),
  bio: z.string().trim().max(1000, 'Giới thiệu tối đa 1000 ký tự'),
  coachStatus: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']),
  role: z.enum(['COACH', 'RECEPTIONIST']),
  // note: khi sửa, role/email/password không register nên giữ nguyên giá trị mặc định
  email: z.string(),
  password: z.string(),
});

// note: email và mật khẩu chỉ bắt buộc khi tạo mới; khi sửa backend không cho đổi
const createSchema = baseSchema.extend({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').max(72, 'Mật khẩu tối đa 72 ký tự'),
});

type FormValues = z.infer<typeof baseSchema>;

const SERVER_FIELDS = ['staffCode', 'displayName', 'phone', 'email', 'password', 'hiredAt', 'bio'] as const;

type Props = {
  open: boolean;
  /** null = tạo mới */
  staff: StaffMember | null;
  onClose: () => void;
};

// FR-07: một form dùng cho cả tạo mới và chỉnh sửa nhân sự
export function StaffFormDialog({ open, staff, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={staff ? 'Sửa thông tin nhân sự' : 'Thêm nhân sự'}
      description={
        staff
          ? 'Không thể đổi vai trò hoặc email. Khóa tài khoản bằng nút Khóa trong bảng.'
          : 'Nhân sự nhận mã OTP qua email để kích hoạt, sau đó đăng nhập bằng mật khẩu ban đầu và tự đổi lại.'
      }
    >
      {/* note: key để form reset khi mở cho người khác hoặc chuyển giữa tạo/sửa */}
      {open && <StaffForm key={staff?.id ?? 'new'} staff={staff} onClose={onClose} />}
    </Dialog>
  );
}

function StaffForm({ staff, onClose }: { staff: StaffMember | null; onClose: () => void }) {
  const id = useId();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(staff ? baseSchema : createSchema),
    defaultValues: {
      role: staff?.role ?? 'COACH',
      staffCode: staff?.staffCode ?? '',
      displayName: staff?.displayName ?? '',
      phone: staff?.phone ?? '',
      email: staff?.email ?? '',
      password: '',
      hiredAt: staff?.hiredAt ?? '',
      bio: staff?.bio ?? '',
      coachStatus: staff?.coachStatus ?? 'ACTIVE',
    },
  });
  const { errors, dirtyFields } = form.formState;
  const watchedRole = form.watch('role');
  const isCoach = (staff ? staff.role : watchedRole) === 'COACH';
  const pending = create.isPending || update.isPending;

  const showServerError = (err: unknown) => {
    const apiError = parseApiError(err);
    // note: backend trả field trùng trong details.field (email | phone), mã trùng thì code STAFF_CODE_EXISTS
    const duplicated = (apiError.details as { field?: string } | undefined)?.field;
    if (apiError.code === 'ACCOUNT_EXISTS' && (duplicated === 'email' || duplicated === 'phone')) {
      form.setError(duplicated, { type: 'server', message: apiError.message }, { shouldFocus: true });
      return;
    }
    const applied = applyFieldErrors(form.setError, apiError, SERVER_FIELDS, {
      STAFF_CODE_EXISTS: 'staffCode',
      STAFF_CODE_REQUIRED: 'staffCode',
    });
    if (!applied) setFormError(apiError.message);
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      if (!staff) {
        const created = await create.mutateAsync({
          role: values.role,
          staffCode: values.staffCode.trim(),
          displayName: values.displayName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          password: values.password,
          ...(values.hiredAt ? { hiredAt: values.hiredAt } : {}),
          ...(values.role === 'COACH' && values.bio.trim() ? { bio: values.bio.trim() } : {}),
        });
        toast(
          created.emailSent
            ? `Đã tạo tài khoản ${created.displayName}. Mã kích hoạt đã gửi tới ${created.email}.`
            : `Đã tạo tài khoản ${created.displayName} nhưng chưa gửi được email kích hoạt.`,
        );
      } else {
        // note: chỉ gửi trường đã sửa để audit log gọn và không vướng rule "ít nhất một trường"
        const input: UpdateStaffInput = {};
        if (dirtyFields.staffCode) input.staffCode = values.staffCode.trim();
        if (dirtyFields.displayName) input.displayName = values.displayName.trim();
        if (dirtyFields.phone) input.phone = values.phone.trim();
        if (dirtyFields.hiredAt) input.hiredAt = values.hiredAt || null;
        if (isCoach && dirtyFields.bio) input.bio = values.bio.trim() || null;
        if (isCoach && dirtyFields.coachStatus) input.coachStatus = values.coachStatus as CoachStatus;
        if (Object.keys(input).length === 0) {
          setFormError('Bạn chưa thay đổi thông tin nào.');
          return;
        }
        await update.mutateAsync({ id: staff.id, input });
        toast(`Đã cập nhật ${values.displayName.trim()}.`);
      }
      onClose();
    } catch (err) {
      showServerError(err);
    }
  };

  const fieldId = (name: Path<FormValues>) => `${id}-${name}`;
  const aria = (name: Path<FormValues>, hint = false) => ({
    id: fieldId(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': describedBy(fieldId(name), { error: errors[name], hint }),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId('role')} label="Vai trò" required hint={staff ? 'Không thể đổi vai trò' : undefined}>
          {staff ? (
            // note: khi sửa chỉ hiển thị, không register để react-hook-form không gửi/validate trường này
            <input className={inputClass} readOnly value={staffRoleLabel(staff.role)} {...aria('role', true)} />
          ) : (
            <select className={inputClass} {...aria('role')} {...form.register('role')}>
              {staffRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={fieldId('staffCode')} label="Mã nhân sự" required error={errors.staffCode?.message}>
          <input className={`${inputClass} uppercase`} autoComplete="off" {...aria('staffCode')} {...form.register('staffCode')} />
        </Field>
      </div>

      <Field id={fieldId('displayName')} label="Họ tên" required error={errors.displayName?.message}>
        <input className={inputClass} autoComplete="off" {...aria('displayName')} {...form.register('displayName')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={fieldId('email')}
          label="Email"
          required={!staff}
          error={errors.email?.message}
          hint={staff ? 'Không thể đổi email' : undefined}
        >
          {staff ? (
            <input type="email" className={inputClass} readOnly value={staff.email} {...aria('email', true)} />
          ) : (
            <input type="email" className={inputClass} autoComplete="off" {...aria('email')} {...form.register('email')} />
          )}
        </Field>
        <Field id={fieldId('phone')} label="Số điện thoại" required error={errors.phone?.message}>
          <input type="tel" className={inputClass} autoComplete="off" {...aria('phone')} {...form.register('phone')} />
        </Field>
      </div>

      {!staff && (
        <Field id={fieldId('password')} label="Mật khẩu ban đầu" required error={errors.password?.message} hint="Ít nhất 8 ký tự.">
          <input type="password" className={inputClass} autoComplete="new-password" {...aria('password', true)} {...form.register('password')} />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId('hiredAt')} label="Ngày vào làm" error={errors.hiredAt?.message}>
          <input type="date" className={inputClass} {...aria('hiredAt')} {...form.register('hiredAt')} />
        </Field>
        {staff && isCoach && (
          <Field id={fieldId('coachStatus')} label="Tình trạng làm việc">
            <select className={inputClass} {...aria('coachStatus')} {...form.register('coachStatus')}>
              {coachStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {isCoach && (
        <Field id={fieldId('bio')} label="Giới thiệu" error={errors.bio?.message}>
          <textarea className={textareaClass} {...aria('bio')} {...form.register('bio')} />
        </Field>
      )}

      {formError && <InlineAlert>{formError}</InlineAlert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          {staff ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        </Button>
      </div>
    </form>
  );
}
