import type { HTMLAttributes, ReactNode } from 'react';
import { cardClass, eyebrowClass } from './styles';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`${cardClass} ${className}`} {...props}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`${eyebrowClass} ${className}`}>{children}</span>;
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-.025em] text-ink sm:text-[34px]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeading({ title, description, actions, id }: { title: string; description?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-extrabold tracking-[-.015em] text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: 'primary' | 'lime' | 'energy' | 'sky';
};

const statTones = {
  primary: 'bg-primary text-white',
  lime: 'bg-accent-lime text-ink',
  energy: 'bg-accent-energy text-white',
  sky: 'bg-accent-sky text-ink',
};

export function StatTile({ label, value, hint, icon, tone = 'primary' }: StatTileProps) {
  return (
    <div className={`${cardClass} flex items-start gap-3.5 p-4 sm:p-5`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl ${statTones[tone]}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <p className="mt-1 text-2xl leading-tight font-extrabold tracking-[-.02em] text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs leading-snug text-muted">{hint}</p>}
      </div>
    </div>
  );
}
