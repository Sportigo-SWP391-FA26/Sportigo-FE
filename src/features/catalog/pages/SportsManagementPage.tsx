import { Plus, Tag } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../training/components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { Dialog } from '../../training/components/ui/Dialog';
import { Field } from '../../training/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../training/components/ui/States';
import { inputClass, textareaClass } from '../../training/components/ui/styles';
import { parseApiError } from '../../training/errors';
import { useCreateSport, useSetSportActive, useSports, useUpdateSport } from '../hooks';
import type { Sport, SportInput } from '../types';

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên môn thể thao.').max(100, 'Tên môn tối đa 100 ký tự.'),
  description: z.string(),
  imageUrl: z.string(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function SportsManagementPage() {
  const sports = useSports();
  const [formTarget, setFormTarget] = useState<Sport | null | undefined>();
  const setActive = useSetSportActive();

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Cấu hình dịch vụ"
        title="Quản lý bộ môn"
        description="Tạo, cập nhật hoặc ngừng môn thể thao. Môn đang được lớp hay khóa học sử dụng không thể xóa."
        actions={<Button icon={<Plus aria-hidden="true" />} onClick={() => setFormTarget(null)}>Thêm bộ môn</Button>}
      />
      <Card className="p-5 sm:p-6">
        <SectionHeading title="Danh sách môn thể thao" description="Môn ngừng hoạt động không nên dùng để tạo dịch vụ mới." />
        {sports.isPending ? (
          <ListSkeleton label="Đang tải danh sách bộ môn…" />
        ) : sports.isError ? (
          <ErrorState error={sports.error} onRetry={() => sports.refetch()} retrying={sports.isRefetching} pendingApi="GET /api/sports" />
        ) : sports.data.length === 0 ? (
          <EmptyState icon={<Tag />} title="Chưa có bộ môn" description="Tạo môn thể thao đầu tiên cho trung tâm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted"><tr><th className="py-2 pr-3">Môn thể thao</th><th className="py-2 pr-3">Mô tả</th><th className="py-2 pr-3">Trạng thái</th><th className="py-2 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-line">
                {sports.data.map((sport) => (
                  <tr key={sport.id}>
                    <td className="py-3 pr-3 font-bold">{sport.name}</td>
                    <td className="py-3 pr-3 text-muted">{sport.description || '—'}</td>
                    <td className="py-3 pr-3"><Chip tone={sport.isActive ? 'success' : 'neutral'} dot>{sport.isActive ? 'Đang hoạt động' : 'Đã ngừng'}</Chip></td>
                    <td className="py-3 text-right"><div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setFormTarget(sport)}>Sửa</Button>
                      <Button size="sm" variant="secondary" loading={setActive.isPending} disabled={setActive.isPending} onClick={async () => {
                        try {
                          await setActive.mutateAsync({ id: sport.id, isActive: !sport.isActive });
                          toast(sport.isActive ? 'Đã ngừng bộ môn.' : 'Đã kích hoạt bộ môn.');
                        } catch (error) {
                          toast(parseApiError(error).message, 'error');
                        }
                      }}>{sport.isActive ? 'Ngừng' : 'Kích hoạt'}</Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {formTarget !== undefined && <SportFormDialog sport={formTarget} onClose={() => setFormTarget(undefined)} />}
    </div>
  );
}

function SportFormDialog({ sport, onClose }: { sport: Sport | null; onClose: () => void }) {
  const create = useCreateSport();
  const update = useUpdateSport(sport?.id ?? 0);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: sport?.name ?? '',
      description: sport?.description ?? '',
      imageUrl: sport?.imageUrl ?? '',
      isActive: sport?.isActive ?? true,
    },
  });
  const pending = form.formState.isSubmitting || create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    const input: SportInput = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      imageUrl: values.imageUrl.trim() || null,
      isActive: values.isActive,
    };
    try {
      if (sport) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      toast(sport ? 'Đã cập nhật bộ môn.' : 'Đã tạo bộ môn.');
      onClose();
    } catch (error) {
      form.setError('root.server', { message: parseApiError(error).message });
    }
  });
  const errors = form.formState.errors;

  return (
    <Dialog
      open
      onClose={() => { if (!pending) onClose(); }}
      title={sport ? 'Sửa bộ môn' : 'Thêm bộ môn'}
      size="md"
      footer={<><Button variant="secondary" onClick={() => { if (!pending) onClose(); }} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending}>Lưu bộ môn</Button></>}
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="sport-name" label="Tên bộ môn" required error={errors.name?.message}><input id="sport-name" className={inputClass} aria-invalid={Boolean(errors.name)} {...form.register('name')} /></Field>
        <Field id="sport-description" label="Mô tả" error={errors.description?.message}><textarea id="sport-description" className={textareaClass} {...form.register('description')} /></Field>
        <Field id="sport-image" label="Đường dẫn hình ảnh" hint="Không bắt buộc."><input id="sport-image" type="url" className={inputClass} {...form.register('imageUrl')} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-primary" {...form.register('isActive')} />Đang hoạt động</label>
        {errors.root?.server?.message && <InlineAlert>{errors.root.server.message}</InlineAlert>}
      </form>
    </Dialog>
  );
}
