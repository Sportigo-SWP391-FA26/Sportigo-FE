import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react';
import { useSyncExternalStore } from 'react';
import { dismissToast, getToasts, subscribeToasts, type ToastTone } from './toast';

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle, className: 'text-accent-lime' },
  error: { icon: WarningCircle, className: 'text-danger' },
  info: { icon: Info, className: 'text-primary' },
};

export function Toaster() {
  const messages = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {messages.map((item) => {
        const { icon: Icon, className } = toneStyles[item.tone];
        return (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-raised motion-safe:animate-[toast-in_.2s_ease-out]"
          >
            <Icon weight="fill" className={`mt-0.5 size-5 shrink-0 ${className}`} aria-hidden="true" />
            <p className="m-0 flex-1 leading-relaxed">{item.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Đóng thông báo"
              className="-m-1 grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
