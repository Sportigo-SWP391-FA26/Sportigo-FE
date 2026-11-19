import { CaretDown } from '@phosphor-icons/react';
import type { ComponentProps } from 'react';
import { inputClass } from '../../../components/ui/styles';

/** Ô chọn có mũi tên riêng, cách mép phải đều nhau trên mọi trình duyệt */
export function SelectInput({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={`${inputClass} appearance-none pr-10 ${className}`} {...props}>
        {children}
      </select>
      <CaretDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}
