import { Bell } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { formatDateTime } from '../../training/format';
import { useLatestNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '../hooks/useNotifications';

type Props = {
  /** Chỉ gọi API khi đã đăng nhập (một số trang /member chưa bắt đăng nhập) */
  enabled?: boolean;
  /** Class cho nút chuông để khớp giao diện từng layout */
  buttonClassName?: string;
  /** Phía mở dropdown: navbar Member ở góc phải, Sidebar ở bên trái */
  align?: 'left' | 'right';
};

// FR-54: chuông có số chưa đọc + danh sách 10 thông báo mới nhất
export function NotificationBell({ enabled = true, buttonClassName = '', align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = useLatestNotifications(enabled);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = latest.data?.unreadCount ?? 0;

  // note: đóng dropdown khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`relative ${buttonClassName}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {/* note: chỉ hiện huy hiệu khi có thông báo chưa đọc; quá 9 thì ghi 9+ cho gọn */}
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] leading-[18px] font-extrabold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Thông báo"
          className={`absolute top-full z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-card border border-line bg-surface text-left text-ink shadow-card ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-extrabold">Thông báo</p>
            <button
              type="button"
              className="text-xs font-bold text-primary-deep hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          {latest.isPending ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Đang tải…</p>
          ) : latest.isError ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Chưa tải được thông báo. Thử lại sau.</p>
          ) : latest.data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Bạn chưa có thông báo nào.</p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {latest.data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    // note: bấm vào thông báo chưa đọc thì đánh dấu đã đọc; đã đọc thì không gọi API nữa
                    onClick={() => !item.isRead && markRead.mutate(item.id)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-canvas ${item.isRead ? '' : 'bg-primary/5'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-primary'}`}
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm ${item.isRead ? 'font-semibold' : 'font-extrabold'}`}>
                        {item.title}
                        {!item.isRead && <span className="sr-only"> (chưa đọc)</span>}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.content}</span>
                      <span className="mt-1 block text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
