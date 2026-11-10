import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../api/client';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/styles';
import { parseApiError, retryServerErrors } from '../../training/errors';

type CenterSettings = { minimumShifts: number };

const MAX_SHIFTS_PER_WEEK = 28;
const settingsKey = ['center-settings'];

const getSettings = () => apiClient.get<{ data: CenterSettings }>('/center-settings').then((response) => response.data.data);
const saveSettings = (input: CenterSettings) => apiClient.put<{ data: CenterSettings }>('/center-settings', input).then((response) => response.data.data);

export function CenterSettingsPage() {
  const settings = useQuery({ queryKey: settingsKey, queryFn: getSettings, retry: retryServerErrors });
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <PageHeader eyebrow="Hệ thống" title="Cấu hình trung tâm" description="Các quy định vận hành áp dụng cho toàn trung tâm." />
      {settings.isPending ? (
        <ListSkeleton rows={2} label="Đang tải cấu hình…" />
      ) : settings.isError ? (
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} retrying={settings.isRefetching} pendingApi="GET /api/center-settings" />
      ) : (
        <ShiftForm key={settings.data.minimumShifts} current={settings.data.minimumShifts} />
      )}
    </div>
  );
}

function ShiftForm({ current }: { current: number }) {
  const client = useQueryClient();
  const [value, setValue] = useState(String(current));
  const save = useMutation({ mutationFn: saveSettings, onSuccess: (data) => client.setQueryData(settingsKey, data) });
  const number = Number(value);
  const valid = Number.isInteger(number) && number >= 1 && number <= MAX_SHIFTS_PER_WEEK;
  const submit = async () => {
    try {
      await save.mutateAsync({ minimumShifts: number });
      toast('Đã lưu cấu hình số ca.');
    } catch {
      // Lỗi được hiển thị ngay trong form.
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading title="Đăng ký ca của Coach" description="Áp dụng khi Coach gửi lịch và khi Center Manager duyệt lịch." />
      <Field id="minimum-shifts" label="Số ca tối thiểu mỗi tuần" required hint={`Từ 1 đến ${MAX_SHIFTS_PER_WEEK} ca.`} error={value && !valid ? `Nhập số nguyên từ 1 đến ${MAX_SHIFTS_PER_WEEK}.` : undefined}>
        <input id="minimum-shifts" className={inputClass} type="number" min="1" max={MAX_SHIFTS_PER_WEEK} step="1" value={value} onChange={(event) => setValue(event.target.value)} aria-invalid={Boolean(value) && !valid} />
      </Field>
      {save.isError && <div className="mt-4"><InlineAlert>{parseApiError(save.error).message}</InlineAlert></div>}
      <div className="mt-5 flex justify-end">
        <Button onClick={submit} loading={save.isPending} disabled={!valid || number === current}>Lưu cấu hình</Button>
      </div>
    </Card>
  );
}
