import { X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** sm: hộp xác nhận nổi giữa màn hình; md/lg: form, toàn màn hình trên điện thoại */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** false: bỏ đường kẻ dưới tiêu đề và trên nút (hộp xác nhận ngắn) */
  dividers?: boolean;
};

// Dùng <dialog> gốc của trình duyệt: có focus trap, phím Esc và nền mờ sẵn.
const sizeClasses = {
  sm: 'm-auto h-fit max-h-[90dvh] w-[calc(100%-2rem)] max-w-md rounded-card shadow-raised',
  md: 'm-0 h-dvh max-h-none w-full max-w-none sm:m-auto sm:h-fit sm:max-h-[min(90dvh,860px)] sm:max-w-lg sm:rounded-card sm:shadow-raised',
  lg: 'm-0 h-dvh max-h-none w-full max-w-none sm:m-auto sm:h-fit sm:max-h-[min(90dvh,860px)] sm:max-w-2xl sm:rounded-card sm:shadow-raised',
  xl: 'm-0 h-dvh max-h-none w-full max-w-none sm:m-auto sm:h-fit sm:max-h-[min(92dvh,920px)] sm:max-w-5xl sm:rounded-card sm:shadow-raised',
};

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dividers = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={`overflow-hidden bg-surface p-0 text-ink backdrop:bg-ink/45 open:flex open:flex-col ${sizeClasses[size]}`}
    >
      {open && (
        <>
          {/* Không có đường kẻ (hộp xác nhận) thì tiêu đề sát nội dung hơn */}
          <header className={`px-5 ${dividers ? 'border-b border-line py-4' : 'pt-4 pb-2'}`}>
            {/* Nút X căn giữa theo dòng tiêu đề; -my-2 để nút 44px không làm header cao thêm */}
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className="min-w-0 text-lg font-extrabold tracking-[-.015em]">
                {title}
              </h2>
              {/* Vùng bấm vẫn 44px, nhưng nền hover/focus chỉ 32px để nút trông gọn */}
              <button
                type="button"
                className="group -my-2 -mr-2 inline-grid size-11 shrink-0 place-items-center rounded-control text-lg text-muted focus-visible:outline-none"
                onClick={onClose}
                aria-label="Đóng"
              >
                <span className="grid size-8 place-items-center rounded-lg transition-colors group-hover:bg-primary/8 group-hover:text-primary-deep group-focus-visible:outline-2 group-focus-visible:outline-primary">
                  <X aria-hidden="true" />
                </span>
              </button>
            </div>
            {description && <div className="mt-1 text-[13px] leading-relaxed text-muted">{description}</div>}
          </header>
          {/* min-h-0: cho phần thân co lại trong flex để chỉ phần này cuộn, tránh 2 thanh cuộn */}
          {/* Không có đường kẻ thì thân sát tiêu đề hơn để khoảng cách không bị hở */}
          <div className={`min-h-0 flex-1 overflow-y-auto px-5 ${dividers ? 'py-5' : 'py-1'}`}>{children}</div>
          {footer && (
            <footer className={`flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end ${dividers ? 'border-t border-line' : ''}`}>
              {footer}
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  confirmDisabled?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  loading,
  confirmDisabled,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dividers={false}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-ink/85">
        {description}
        {error}
      </div>
    </Dialog>
  );
}
