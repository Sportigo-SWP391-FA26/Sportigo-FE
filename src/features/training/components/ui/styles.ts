// Chuỗi class dùng chung, chỉ dùng token trong @theme (index.css), không hardcode mã màu.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-bold select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55 motion-safe:active:scale-[.98] motion-safe:disabled:active:scale-100';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-[0_10px_22px_-12px_var(--color-primary)] hover:bg-primary-deep disabled:hover:bg-primary',
  secondary: 'border border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary/5 disabled:hover:border-line disabled:hover:bg-surface',
  ghost: 'text-primary-deep hover:bg-primary/8 disabled:hover:bg-transparent',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

// md cao 44px để đủ vùng bấm trên điện thoại
const buttonSizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm',
  sm: 'min-h-9 px-3 text-[13px]',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${extra}`.trim();
}

export const iconButtonClass =
  'inline-grid size-11 shrink-0 place-items-center rounded-control text-lg text-muted transition-colors hover:bg-primary/8 hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted';

export const inputClass =
  'block min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-muted/50 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/30 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger/30 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted';

export const textareaClass = `${inputClass} min-h-24 py-2.5 leading-relaxed`;

export const cardClass = 'rounded-card border border-line bg-surface shadow-card';

export const eyebrowClass =
  'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.08em] text-primary-deep';

/** aria-describedby cho ô nhập có lỗi hoặc gợi ý */
export function describedBy(id: string, { error, hint }: { error?: unknown; hint?: unknown }) {
  return [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
}

/** Thuộc tính cho vùng nội dung của Tabs */
export function tabPanelProps(idPrefix: string, value: string) {
  return {
    role: 'tabpanel',
    id: `${idPrefix}-panel-${value}`,
    'aria-labelledby': `${idPrefix}-tab-${value}`,
    tabIndex: 0,
  } as const;
}
