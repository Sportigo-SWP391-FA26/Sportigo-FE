import type { ReactNode } from 'react';

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

// Ô nhập phải tự gắn id, aria-invalid và aria-describedby={describedBy(id, ...)}
export function Field({ id, label, required, error, hint, className = '', children }: FieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-bold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs leading-snug font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Option<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  name: string;
  legend: string;
  hideLegend?: boolean;
  options: readonly Option<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  optionClassName?: (value: T, checked: boolean) => string;
};

/**
 * Nhóm lựa chọn dạng nút nhưng dùng radio gốc: Tab vào nhóm, phím mũi tên để đổi,
 * trình đọc màn hình đọc đúng "1 trên 4 lựa chọn".
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  hideLegend,
  options,
  value,
  onChange,
  disabled,
  className = '',
  optionClassName,
}: SegmentedProps<T>) {
  return (
    <fieldset className={`min-w-0 ${className}`} disabled={disabled}>
      <legend className={hideLegend ? 'sr-only' : 'mb-1.5 text-[13px] font-bold text-ink'}>{legend}</legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-2 text-center text-[13px] leading-tight font-bold whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                optionClassName?.(option.value, checked) ??
                (checked
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary/5')
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
