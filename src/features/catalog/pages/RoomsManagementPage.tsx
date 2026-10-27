import { Door, Plus } from '@phosphor-icons/react';
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
import { inputClass } from '../../training/components/ui/styles';
import { parseApiError } from '../../training/errors';
import { useCreateRoom, useRooms, useUpdateRoom } from '../hooks';
import type { Room, RoomInput, RoomStatus } from '../types';

const schema = z.object({
  code: z.string().trim().min(1, 'Nhập mã phòng.').max(30, 'Mã phòng tối đa 30 ký tự.'),
  name: z.string().trim().min(1, 'Nhập tên phòng.').max(100, 'Tên phòng tối đa 100 ký tự.'),
  capacity: z.string().regex(/^[1-9]\d*$/, 'Sức chứa phải là số nguyên dương.'),
  location: z.string(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'INACTIVE']),
});
type Values = z.infer<typeof schema>;
const statusNames: Record<RoomStatus, string> = { AVAILABLE: 'Khả dụng', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngừng sử dụng' };

export function RoomsManagementPage() {
  const rooms = useRooms();
  const [formTarget, setFormTarget] = useState<Room | null | undefined>();

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Cấu hình cơ sở"
        title="Quản lý phòng tập"
        description="Quản lý mã phòng, sức chứa, vị trí và trạng thái. Phòng bảo trì hoặc ngừng sử dụng không được xếp lịch."
        actions={<Button icon={<Plus aria-hidden="true" />} onClick={() => setFormTarget(null)}>Thêm phòng</Button>}
      />
      <Card className="p-5 sm:p-6">
        <SectionHeading title="Danh sách phòng" description="Sức chứa phải lớn hơn 0; mã phòng là duy nhất." />
        {rooms.isPending ? (
          <ListSkeleton label="Đang tải danh sách phòng…" />
        ) : rooms.isError ? (
          <ErrorState error={rooms.error} onRetry={() => rooms.refetch()} retrying={rooms.isRefetching} pendingApi="GET /api/rooms" />
        ) : rooms.data.length === 0 ? (
          <EmptyState icon={<Door />} title="Chưa có phòng tập" description="Tạo phòng đầu tiên cho trung tâm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted"><tr><th className="py-2 pr-3">Mã phòng</th><th className="py-2 pr-3">Tên phòng</th><th className="py-2 pr-3">Sức chứa</th><th className="py-2 pr-3">Vị trí</th><th className="py-2 pr-3">Trạng thái</th><th className="py-2 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-line">
                {rooms.data.map((room) => (
                  <tr key={room.id}>
                    <td className="py-3 pr-3 font-bold">{room.code}</td><td className="py-3 pr-3">{room.name}</td><td className="py-3 pr-3">{room.capacity}</td><td className="py-3 pr-3 text-muted">{room.location || '—'}</td>
                    <td className="py-3 pr-3"><Chip tone={room.status === 'AVAILABLE' ? 'success' : room.status === 'MAINTENANCE' ? 'warning' : 'neutral'} dot>{statusNames[room.status]}</Chip></td>
                    <td className="py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setFormTarget(room)}>Sửa</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {formTarget !== undefined && <RoomFormDialog room={formTarget} onClose={() => setFormTarget(undefined)} />}
    </div>
  );
}

function RoomFormDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const create = useCreateRoom();
  const update = useUpdateRoom(room?.id ?? 0);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: room?.code ?? '',
      name: room?.name ?? '',
      capacity: String(room?.capacity ?? ''),
      location: room?.location ?? '',
      status: room?.status ?? 'AVAILABLE',
    },
  });
  const pending = form.formState.isSubmitting || create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    const input: RoomInput = {
      ...(room ? {} : { code: values.code.trim() }),
      name: values.name.trim(),
      capacity: Number(values.capacity),
      location: values.location.trim() || null,
      status: values.status,
    };
    try {
      if (room) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      toast(room ? 'Đã cập nhật phòng.' : 'Đã tạo phòng.');
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
      title={room ? 'Sửa thông tin phòng' : 'Thêm phòng'}
      size="md"
      footer={<><Button variant="secondary" onClick={() => { if (!pending) onClose(); }} disabled={pending}>Đóng</Button><Button onClick={submit} loading={pending}>Lưu phòng</Button></>}
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="room-code" label="Mã phòng" required error={errors.code?.message}><input id="room-code" className={inputClass} disabled={Boolean(room)} aria-invalid={Boolean(errors.code)} {...form.register('code')} /></Field>
        <Field id="room-name" label="Tên phòng" required error={errors.name?.message}><input id="room-name" className={inputClass} aria-invalid={Boolean(errors.name)} {...form.register('name')} /></Field>
        <Field id="room-capacity" label="Sức chứa" required error={errors.capacity?.message}><input id="room-capacity" type="number" min="1" step="1" className={inputClass} aria-invalid={Boolean(errors.capacity)} {...form.register('capacity')} /></Field>
        <Field id="room-location" label="Vị trí"><input id="room-location" className={inputClass} {...form.register('location')} /></Field>
        <Field id="room-status" label="Trạng thái"><select id="room-status" className={inputClass} {...form.register('status')}><option value="AVAILABLE">Khả dụng</option><option value="MAINTENANCE">Bảo trì</option><option value="INACTIVE">Ngừng sử dụng</option></select></Field>
        {errors.root?.server?.message && <InlineAlert>{errors.root.server.message}</InlineAlert>}
      </form>
    </Dialog>
  );
}
