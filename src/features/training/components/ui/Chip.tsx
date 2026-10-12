import type { ReactNode } from 'react';
import type { Tone } from '../../labels';

// Chữ luôn dùng màu đậm để đủ tương phản; màu trạng thái nằm ở nền và chấm tròn.
const toneClasses: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-canvas text-ink/80 ring-1 ring-inset ring-line', dot: 'bg-muted' },
  primary: { chip: 'bg-primary/10 text-primary-deep', dot: 'bg-primary' },
  success: { chip: 'bg-accent-lime/18 text-ink', dot: 'bg-accent-lime' },
  warning: { chip: 'bg-accent-energy/14 text-ink', dot: 'bg-accent-energy' },
  danger: { chip: 'bg-danger/10 text-danger', dot: 'bg-danger' },
  info: { chip: 'bg-accent-sky/18 text-ink', dot: 'bg-accent-sky' },
};

type ChipProps = {
  tone?: Tone;
  dot?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
};

export function Chip({ tone = 'neutral', dot = false, title, className = '', children }: ChipProps) {
  const classes = toneClasses[tone];
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs leading-[1.45] font-bold ${classes.chip} ${className}`}
    >
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${classes.dot}`} aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
