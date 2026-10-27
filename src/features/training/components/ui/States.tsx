import { ArrowClockwise, HourglassMedium, LockKey, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { getSessionRole, roleHomePath } from '../../../../components/auth/session';
import { parseApiError } from '../../errors';
import { Button, ButtonLink } from './Button';
import { cardClass } from './styles';

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block rounded-lg bg-line/80 motion-safe:animate-pulse ${className}`} aria-hidden="true" />;
}

/** Khung chờ dạng danh sách; có nhãn cho trình đọc màn hình */
export function ListSkeleton({ rows = 4, label = 'Đang tải dữ liệu…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={`${cardClass} flex items-center gap-4 p-4`}>
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

type StatePanelProps = {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'danger' | 'warning';
  compact?: boolean;
};

const iconTones = {
  neutral: 'bg-primary/10 text-primary-deep',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-accent-energy/14 text-ink',
};

function StatePanel({ icon, title, description, action, tone = 'neutral', compact = false }: StatePanelProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? 'gap-2 px-4 py-6' : `${cardClass} gap-3 px-6 py-10 sm:py-14`}`}
    >
      <span className={`grid size-12 place-items-center rounded-2xl text-2xl ${iconTones[tone]}`} aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-base font-extrabold text-ink">{title}</h3>
      {description && <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon, ...props }: Omit<StatePanelProps, 'icon' | 'tone'> & { icon?: ReactNode }) {
  return <StatePanel icon={icon ?? <MagnifyingGlass />} {...props} />;
}

type NotReadyProps = {
  title?: string;
  description: ReactNode;
  api: string;
  compact?: boolean;
};

/** Chức năng cần API backend chưa có: báo rõ, không hiển thị dữ liệu giả */
export function NotReady({ title = 'Chức năng chưa sẵn sàng', description, api, compact }: NotReadyProps) {
  return (
    <StatePanel
      compact={compact}
      tone="warning"
      icon={<HourglassMedium />}
      title={title}
      description={
        <>
          {description}
          <span className="mt-2 block text-xs">
            Cần API: <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink">{api}</code>
          </span>
        </>
      }
    />
  );
}

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  /** API cần bổ sung, hiển thị khi backend trả 404 "route missing" */
  pendingApi?: string;
};

export function ErrorState({ error, onRetry, retrying, compact, pendingApi }: ErrorStateProps) {
  const apiError = parseApiError(error);

  if (apiError.kind === 'not-ready') {
    return <NotReady compact={compact} description={apiError.message} api={pendingApi ?? 'đang chờ backend'} />;
  }
  if (apiError.kind === 'unauthenticated') {
    return (
      <StatePanel
        compact={compact}
        tone="warning"
        icon={<LockKey />}
        title="Cần đăng nhập lại"
        description={apiError.message}
        action={<ButtonLink to="/login" variant="primary">Đăng nhập</ButtonLink>}
      />
    );
  }
  if (apiError.kind === 'forbidden') {
    const role = getSessionRole();
    return (
      <StatePanel
        compact={compact}
        tone="danger"
        icon={<LockKey />}
        title="Bạn không có quyền xem nội dung này"
        description={apiError.message}
        action={<ButtonLink to={role ? roleHomePath[role] : '/'}>Về trang của bạn</ButtonLink>}
      />
    );
  }
  return (
    <StatePanel
      compact={compact}
      tone="danger"
      icon={<WarningCircle />}
      title={apiError.kind === 'not-found' ? 'Không tìm thấy dữ liệu' : 'Không tải được dữ liệu'}
      description={apiError.message}
      action={
        onRetry && apiError.kind !== 'not-found' ? (
          <Button variant="secondary" onClick={onRetry} loading={retrying} icon={<ArrowClockwise aria-hidden="true" />}>
            Thử lại
          </Button>
        ) : undefined
      }
    />
  );
}

/** Thông báo lỗi ngắn trong form hoặc dưới khối nội dung */
export function InlineAlert({ tone = 'danger', children }: { tone?: 'danger' | 'warning' | 'info'; children: ReactNode }) {
  const tones = {
    danger: 'border-danger/25 bg-danger/6 text-danger',
    warning: 'border-accent-energy/35 bg-accent-energy/8 text-ink',
    info: 'border-primary/20 bg-primary/6 text-primary-deep',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${tones[tone]}`}>
      <WarningCircle weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
