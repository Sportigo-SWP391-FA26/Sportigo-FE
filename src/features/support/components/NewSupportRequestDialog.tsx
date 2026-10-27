import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { applyFieldErrors, parseApiError } from '../../training/errors';
import { Button } from '../../training/components/ui/Button';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { InlineAlert } from '../../training/components/ui/States';
import { describedBy, inputClass, textareaClass } from '../../training/components/ui/styles';
import { useCreateSupportRequest } from '../hooks/useSupport';
import { categoryOptions, priorityOptions } from '../labels';

// note: cùng giới hạn với createSupportRequestSchema bên backend
const requestSchema = z.object({
  subject: z.string().trim().min(5, 'Chủ đề cần ít nhất 5 ký tự').max(200, 'Chủ đề tối đa 200 ký tự'),
  category: z.enum(['ACCOUNT', 'PAYMENT', 'CLASS', 'PRIVATE_COURSE', 'FACILITY', 'OTHER']),
  description: z.string().trim().min(10, 'Nội dung cần ít nhất 10 ký tự').max(5000, 'Nội dung tối đa 5000 ký tự'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});
type RequestValues = z.infer<typeof requestSchema>;

// FR-55: Member gửi yêu cầu hỗ trợ mới
export function NewSupportRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Gửi yêu cầu hỗ trợ" description="Trung tâm sẽ phản hồi trong mục Hỗ trợ và gửi thông báo cho bạn.">
      {open && <RequestForm onClose={onClose} />}
    </Dialog>
  );
}

function RequestForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const navigate = useNavigate();
  const create = useCreateSupportRequest();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { subject: '', category: 'OTHER', description: '', priority: 'MEDIUM' },
  });
  const { errors } = form.formState;

  const onSubmit = async (values: RequestValues) => {
    setFormError(null);
    try {
      const created = await create.mutateAsync(values);
      toast('Đã gửi yêu cầu hỗ trợ.');
      onClose();
      // note: chuyển thẳng tới trang chi tiết để Member theo dõi trạng thái và nhắn thêm
      navigate(`/member/support/${created.id}`);
    } catch (err) {
      const apiError = parseApiError(err);
      if (!applyFieldErrors(form.setError, apiError, ['subject', 'category', 'description', 'priority'])) setFormError(apiError.message);
    }
  };

  const fieldId = (name: Path<RequestValues>) => `${id}-${name}`;
  const aria = (name: Path<RequestValues>) => ({
    id: fieldId(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': describedBy(fieldId(name), { error: errors[name] }),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id={fieldId('subject')} label="Chủ đề" required error={errors.subject?.message}>
        <input className={inputClass} autoComplete="off" {...aria('subject')} {...form.register('subject')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId('category')} label="Loại yêu cầu" required>
          <select className={inputClass} {...aria('category')} {...form.register('category')}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={fieldId('priority')} label="Mức ưu tiên" required>
          <select className={inputClass} {...aria('priority')} {...form.register('priority')}>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id={fieldId('description')} label="Nội dung" required error={errors.description?.message}>
        <textarea className={`${textareaClass} min-h-36`} {...aria('description')} {...form.register('description')} />
      </Field>

      {formError && <InlineAlert>{formError}</InlineAlert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
          Hủy
        </Button>
        <Button type="submit" loading={create.isPending}>
          Gửi yêu cầu
        </Button>
      </div>
    </form>
  );
}
