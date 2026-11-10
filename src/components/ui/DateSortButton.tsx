import { SortAscending, SortDescending } from '@phosphor-icons/react';
import { Button } from './Button';

export type DateSortOrder = 'newest' | 'oldest';

/** Sắp xếp theo chuỗi ISO; bản ghi thiếu ngày luôn nằm cuối danh sách. */
export function sortByDate<T>(items: T[], getDate: (item: T) => string | null | undefined, order: DateSortOrder) {
  return [...items].sort((left, right) => {
    const leftDate = getDate(left);
    const rightDate = getDate(right);
    if (!leftDate || !rightDate) return Number(!leftDate) - Number(!rightDate);
    return order === 'newest' ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
  });
}

export function DateSortButton({ order, onChange }: { order: DateSortOrder; onChange: (order: DateSortOrder) => void }) {
  const isNewest = order === 'newest';
  const Icon = isNewest ? SortDescending : SortAscending;
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Icon weight="bold" aria-hidden="true" />}
      aria-label={`Đang sắp xếp ${isNewest ? 'mới nhất' : 'cũ nhất'} trước. Đổi thứ tự ngày đăng ký`}
      onClick={() => onChange(isNewest ? 'oldest' : 'newest')}
    >
      Ngày đăng ký: {isNewest ? 'Mới nhất' : 'Cũ nhất'}
    </Button>
  );
}
