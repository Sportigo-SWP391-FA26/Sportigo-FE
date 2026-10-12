import { X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { iconButtonClass } from './styles';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** sm: hộp xác nhận nổi giữa màn hình; md/lg: form, toàn màn hình trên điện thoại */
  size?: 'sm' | 'md' | 'lg';
};

// Dùng <dialog> gốc của trình duyệt: có focus trap, phím Esc và nền mờ sẵn.
const sizeClasses = {
  sm: 'm-auto h-fit max-h-[90dvh] w-[calc(100%-2rem)] max-w-md rounded-card shadow-raised',
  md: 'm-0 h-dvh max-h-none w-full max-w-none sm:m-auto sm:h-fit sm:max-h-[min(90dvh,860px)] sm:max-w-lg sm:rounded-card sm:shadow-raised',
  lg: 'm-0 h-dvh max-h-none w-full max-w-none sm:m-auto sm:h-fit sm:max-h-[min(90dvh,860px)] sm:max-w-2xl sm:rounded-card sm:shadow-raised',
};

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) {
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
      className={`bg-surface p-0 text-ink backdrop:bg-ink/45 open:flex open:flex-col ${sizeClasses[size]}`}
    >
      {open && (
        <>
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-extrabold tracking-[-.015em]">
                {title}
              </h2>
              {description && <div className="mt-1 text-[13px] leading-relaxed text-muted">{description}</div>}
            </div>
            <button type="button" className={`${iconButtonClass} -mr-2`} onClick={onClose} aria-label="Đóng">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
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
