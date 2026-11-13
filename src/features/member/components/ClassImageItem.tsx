import { ArrowRight } from '@phosphor-icons/react';
import type { ClassSchedule } from '../types';

export function ClassImageItem({ item, onSelect }: { item: ClassSchedule; onSelect?: (item: ClassSchedule) => void }) {
  return (
    <article className="class-image-item">
      <img src={item.image} alt={item.sport} loading="lazy" />
      <div><h3>{item.title}</h3><button onClick={() => onSelect?.(item)} aria-label={`Xem ${item.title}`}><ArrowRight /></button></div>
    </article>
  );
}
