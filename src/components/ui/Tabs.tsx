import { useRef, type KeyboardEvent } from 'react';

type TabsProps<T extends string> = {
  label: string;
  idPrefix: string;
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// Mẫu ARIA tablist: Tab vào tab đang chọn, mũi tên trái/phải/Home/End để chuyển.
export function Tabs<T extends string>({ label, idPrefix, tabs, value, onChange }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-2xl bg-line/60 p-1">
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.value}`}
            aria-controls={`${idPrefix}-panel-${tab.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              selected ? 'bg-surface text-primary-deep shadow-card' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

