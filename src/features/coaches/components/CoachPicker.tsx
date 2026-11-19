import { CaretDown, Check } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import { inputClass } from '../../../components/ui/styles';
import type { QualifiedCoach } from '../types';

type CoachPickerProps = {
  id: string;
  coaches: QualifiedCoach[];
  value: string;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (coachId: string) => void;
};

// Native <select> không hiển thị được ảnh, nên dùng listbox để phân biệt Coach trùng tên.
export function CoachPicker({ id, coaches, value, placeholder, disabled = false, invalid = false, onChange }: CoachPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = coaches.find((coach) => String(coach.id) === value);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const openList = () => {
    setActiveIndex(Math.max(0, coaches.findIndex((coach) => String(coach.id) === value)));
    setOpen(true);
  };

  const choose = (coach: QualifiedCoach) => {
    onChange(String(coach.id));
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === 'Escape') {
      // Chỉ đóng danh sách, không đóng hộp thoại tạo lớp bên ngoài.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, coaches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const coach = coaches[activeIndex];
      if (coach) choose(coach);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && coaches[activeIndex] ? `${listId}-${coaches[activeIndex].id}` : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={`${inputClass} flex items-center gap-2.5 text-left`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected ? (
          <>
            <Avatar name={selected.displayName} src={selected.avatarUrl} className="size-7 rounded-full" fallbackClassName="text-[10px]" />
            <span className="min-w-0 flex-1 truncate">{selected.displayName} · {selected.coachCode}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted">{placeholder}</span>
        )}
        <CaretDown className="shrink-0 text-muted" aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label="Danh sách Coach" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-line bg-surface p-1 shadow-lg">
          {coaches.map((coach, index) => {
            const isSelected = String(coach.id) === value;
            return (
              <li
                key={coach.id}
                id={`${listId}-${coach.id}`}
                role="option"
                aria-selected={isSelected}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-2.5 py-1.5 ${index === activeIndex ? 'bg-primary/10' : ''}`}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(coach)}
              >
                <Avatar name={coach.displayName} src={coach.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{coach.displayName}</span>
                  <span className="block truncate text-xs text-muted">{coach.coachCode}</span>
                </span>
                {isSelected && <Check className="shrink-0 text-primary-deep" weight="bold" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
