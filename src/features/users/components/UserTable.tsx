import type { ReactNode } from 'react';
import { Chip } from '../../training/components/ui/Chip';
import { roleLabel, statusLabel, statusTone } from '../labels';
import type { UserSummary } from '../types';

type Props = {
  users: UserSummary[];
  /** Cột thao tác tùy trang (khóa/mở khóa, sửa nhân sự...) */
  renderActions?: (user: UserSummary) => ReactNode;
};

// FR-09: bảng người dùng dùng chung cho trang quản lý người dùng / nhân sự / hội viên
export function UserTable({ users, renderActions }: Props) {
  return (
    // note: bảng rộng nên cho cuộn ngang trong khung, trang không bị tràn trên điện thoại
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs font-bold tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Người dùng</th>
            <th scope="col" className="px-4 py-3">Số điện thoại</th>
            <th scope="col" className="px-4 py-3">Vai trò</th>
            <th scope="col" className="px-4 py-3">Mã</th>
            <th scope="col" className="px-4 py-3">Trạng thái</th>
            {renderActions && (
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Thao tác</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {users.map((user) => (
            <tr key={user.id} className="align-middle">
              <td className="px-4 py-3">
                <p className="font-bold text-ink">{user.displayName}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </td>
              <td className="px-4 py-3 text-ink">{user.phone ?? '—'}</td>
              <td className="px-4 py-3 text-ink">{roleLabel(user.role)}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink">{user.code ?? '—'}</td>
              <td className="px-4 py-3">
                <Chip tone={statusTone(user.status)} dot>
                  {statusLabel(user.status)}
                </Chip>
              </td>
              {renderActions && <td className="px-4 py-3 text-right">{renderActions(user)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
