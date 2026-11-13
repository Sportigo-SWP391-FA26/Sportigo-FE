import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { iconButtonClass } from './styles';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
};

export function Pagination({ page, pageSize, total, onChange, disabled }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Phân trang" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
      <p>
        {total === 0 ? 'Không có kết quả' : `Hiển thị ${first}–${last} trên ${total} kết quả`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${iconButtonClass} border border-line bg-surface`}
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Trang trước"
        >
          <CaretLeft aria-hidden="true" />
        </button>
        <span className="min-w-20 text-center font-bold text-ink" aria-live="polite">
          Trang {page}/{pageCount}
        </span>
        <button
          type="button"
          className={`${iconButtonClass} border border-line bg-surface`}
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= pageCount}
          aria-label="Trang sau"
        >
          <CaretRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
