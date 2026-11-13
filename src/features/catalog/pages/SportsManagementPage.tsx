import { ChartLineUp, Plus, Tag } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/ui/Field';
import { ImageUploadField } from '../../../components/ui/ImageUploadField';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { parseApiError } from '../../training/errors';
import { useAssessmentMetrics, useCreateAssessmentMetric, useCreateSport, useSetSportActive, useSports, useUpdateAssessmentMetric, useUpdateSport } from '../hooks';
import type { Sport, SportInput } from '../types';

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên môn thể thao.').max(100, 'Tên môn tối đa 100 ký tự.'),
  description: z.string(),
  imageUrl: z.string(),
  isActive: z.boolean(),
  passingScore: z.string().refine((value) => value.trim() === '' || (Number(value) >= 0 && Number(value) <= 100), 'Ngưỡng điểm phải từ 0 đến 100.'),
});
type Values = z.infer<typeof schema>;

export function SportsManagementPage() {
  const sports = useSports();
  const [formTarget, setFormTarget] = useState<Sport | null | undefined>();
  const [metricSport, setMetricSport] = useState<Sport>();
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
                    <td className="py-3 pr-3 font-bold"><div className="flex items-center gap-3">{sport.imageUrl ? <img src={sport.imageUrl} alt="" className="size-11 rounded-lg object-cover" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary"><Tag aria-hidden="true" /></div>}<span>{sport.name}</span></div></td>
                    <td className="py-3 pr-3 text-muted">{sport.description || '—'}</td>
                    <td className="py-3 pr-3"><Chip tone={sport.isActive ? 'success' : 'neutral'} dot>{sport.isActive ? 'Đang hoạt động' : 'Đã ngừng'}</Chip></td>
                    <td className="py-3 text-right"><div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setMetricSport(sport)}>Chỉ số đánh giá</Button><Button size="sm" variant="secondary" onClick={() => setFormTarget(sport)}>Sửa</Button>
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
      {metricSport && <MetricDialog sport={metricSport} onClose={() => setMetricSport(undefined)} />}
    </div>
  );
}

function MetricDialog({ sport, onClose }: { sport: Sport; onClose: () => void }) {
  const metrics = useAssessmentMetrics(sport.id);
  const create = useCreateAssessmentMetric(sport.id);
  const update = useUpdateAssessmentMetric(sport.id);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('điểm');
  const [error, setError] = useState<string>();
  const submit = async () => {
    setError(undefined);
    try {
      await create.mutateAsync({ code: name.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''), name: name.trim(), unit: unit.trim(), minValue: 0, maxValue: 100, direction: 'HIGHER_IS_BETTER', isRequired: true, isActive: true, displayOrder: metrics.data?.length ?? 0 });
      setName('');
    } catch (cause) { setError(parseApiError(cause).message); }
  };
  return <Dialog open onClose={onClose} title={`Chỉ số đánh giá · ${sport.name}`} size="lg" footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}>
    <p className="mb-4 text-sm text-muted">Coach chỉ được nhập các chỉ số trong danh mục này. Chỉ số đã có dữ liệu không thể đổi mã hoặc bộ môn.</p>
    {metrics.isPending ? <ListSkeleton rows={3} label="Đang tải chỉ số…" /> : metrics.isError ? <ErrorState compact error={metrics.error} onRetry={() => metrics.refetch()} retrying={metrics.isRefetching} /> : <div className="space-y-2">{metrics.data?.map((metric) => <div key={metric.id} className="flex items-center gap-3 rounded-2xl border border-line p-3"><ChartLineUp className="text-primary" /><div className="min-w-0 flex-1"><strong className="block text-sm text-ink">{metric.name}</strong><span className="text-xs text-muted">{metric.minValue}–{metric.maxValue} {metric.unit} · {metric.isRequired ? 'Bắt buộc' : 'Tùy chọn'}</span></div><Chip tone={metric.isActive ? 'success' : 'neutral'}>{metric.isActive ? 'Đang dùng' : 'Đã tắt'}</Chip><Button size="sm" variant="secondary" loading={update.isPending} onClick={async () => { try { await update.mutateAsync({ id: metric.id, input: { isActive: !metric.isActive } }); } catch (cause) { setError(parseApiError(cause).message); } }}>{metric.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</Button></div>)}</div>}
    <div className="mt-5 grid gap-3 rounded-2xl bg-canvas p-4 sm:grid-cols-[1fr_140px_auto]"><input className={inputClass} placeholder="Tên chỉ số mới" value={name} onChange={(event) => setName(event.target.value)} /><input className={inputClass} placeholder="Đơn vị" value={unit} onChange={(event) => setUnit(event.target.value)} /><Button onClick={submit} loading={create.isPending} disabled={!name.trim() || !unit.trim()} icon={<Plus />}>Thêm</Button></div>
    {error && <div className="mt-3"><InlineAlert>{error}</InlineAlert></div>}
  </Dialog>;
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
      passingScore: sport?.passingScore == null ? '' : String(Number(sport.passingScore)),
    },
  });
  const pending = form.formState.isSubmitting || create.isPending || update.isPending;
  const imageUrl = useWatch({ control: form.control, name: 'imageUrl' });
  const submit = form.handleSubmit(async (values) => {
    const input: SportInput = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      imageUrl: values.imageUrl.trim() || null,
      isActive: values.isActive,
      passingScore: values.passingScore.trim() === '' ? null : Number(values.passingScore),
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
        <Field id="sport-passing-score" label="Ngưỡng điểm đạt" hint="Từ 0 đến 100. Để trống nếu chưa áp dụng; đánh giá sẽ không hiện nhãn Đạt/Chưa đạt." error={errors.passingScore?.message}><input id="sport-passing-score" type="number" min="0" max="100" step="0.5" className={inputClass} aria-invalid={Boolean(errors.passingScore)} {...form.register('passingScore')} /></Field>
        <ImageUploadField label="Ảnh bộ môn" value={imageUrl} purpose="sport" disabled={pending} hint="Ảnh hiện tại được giữ nguyên nếu bạn không chọn ảnh mới hoặc upload thất bại." onChange={(url) => form.setValue('imageUrl', url, { shouldDirty: true, shouldValidate: true })} />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-primary" {...form.register('isActive')} />Đang hoạt động</label>
        {errors.root?.server?.message && <InlineAlert>{errors.root.server.message}</InlineAlert>}
      </form>
    </Dialog>
  );
}
