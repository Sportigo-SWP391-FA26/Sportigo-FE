import type { ReactNode } from 'react';
import { intensityLabel, intensityTone, itemSpecs } from '../labels';
import type { WorkoutPlanItem } from '../types';
import { Chip } from './ui/Chip';

type PlanItemListProps = {
  items: WorkoutPlanItem[];
  compact?: boolean;
  /** Vùng thao tác bên phải mỗi mục (màn Coach) */
  renderActions?: (item: WorkoutPlanItem, index: number, items: WorkoutPlanItem[]) => ReactNode;
};

export function PlanItemList({ items, compact = false, renderActions }: PlanItemListProps) {
  return (
    <ol className="divide-y divide-line">
      {items.map((item, index) => {
        const specs = itemSpecs(item);
        return (
          <li key={item.id} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 gap-3">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary-deep"
                aria-label={`Thứ tự ${item.itemOrder}`}
              >
                {item.itemOrder}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="text-sm font-bold text-ink">{item.title}</h4>
                  {item.intensity && (
                    <Chip tone={intensityTone(item.intensity)} dot>
                      {intensityLabel(item.intensity)}
                    </Chip>
                  )}
                </div>
                <p className={`mt-1 text-[13px] leading-relaxed whitespace-pre-line text-muted ${compact ? 'line-clamp-2' : ''}`}>
                  {item.content}
                </p>
                {specs.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Thông số">
                    {specs.map((spec) => (
                      <li key={spec}>
                        <Chip tone="primary">{spec}</Chip>
                      </li>
                    ))}
                  </ul>
                )}
                {item.note && !compact && (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    <span className="font-bold text-ink/80">Ghi chú: </span>
                    {item.note}
                  </p>
                )}
              </div>
            </div>
            {renderActions && <div className="flex shrink-0 flex-wrap gap-1 pl-10 sm:pl-0">{renderActions(item, index, items)}</div>}
          </li>
        );
      })}
    </ol>
  );
}
