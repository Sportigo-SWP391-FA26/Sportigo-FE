import { useState } from 'react';
import { toast } from '../../../components/feedback/toast';
import { ConfirmDialog } from '../../../components/ui/Dialog';
import { InlineAlert } from '../../../components/ui/States';
import { parseApiError } from '../../training/errors';
import { useDeleteUser } from '../hooks/useUsers';
import type { UserSummary } from '../types';

export function DeleteUserDialog({ user, onClose }: { user: UserSummary | null; onClose: () => void }) {
  const remove = useDeleteUser();
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!user) return;
    setError(null);
    try {
      await remove.mutateAsync(user.id);
      toast(`Đã xóa tài khoản ${user.displayName}.`);
      onClose();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <ConfirmDialog
      open={user !== null}
      title="Xóa tài khoản"
      description={
        <>
          <p>
            Tài khoản <strong>{user?.displayName}</strong> ({user?.email}) sẽ bị xóa vĩnh viễn.
          </p>
          <p>Tài khoản sẽ không thể đăng nhập lại. Lịch sử lớp học, thanh toán và Audit Log vẫn được giữ để bảo toàn dữ liệu.</p>
        </>
      }
      confirmLabel="Xóa tài khoản"
      tone="danger"
      loading={remove.isPending}
      error={error ? <InlineAlert>{error}</InlineAlert> : undefined}
      onConfirm={confirm}
      onCancel={onClose}
    />
  );
}
