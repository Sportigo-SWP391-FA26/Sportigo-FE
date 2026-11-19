import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';
import type { ReactNode } from 'react';

const DAYS = [
  { value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' }, { value: 0, label: 'Chủ nhật' },
];

export type TimetableItem = {
  id: string | number;
  dayOfWeek: number;
  date?: string;
  time: string;
  title: string;
  subtitle?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  content?: ReactNode;
};

const mondayOf = (value: string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
};

const shortDate = (value: Date) => value.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
const localDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WEEKS_PER_PAGE = 4;

function ScheduleCard({ item }: { item: TimetableItem }) {
  return (
    <article className={`rounded-xl border p-3 shadow-[0_8px_20px_-16px_rgba(15,23,42,.45)] ${toneClass[item.tone ?? 'primary']}`}>
      <p className="text-xs font-extrabold tabular-nums">{item.time}</p>
      <p className="mt-1 text-sm font-bold leading-snug">{item.title}</p>
      {item.subtitle && <p className="mt-1 text-[11px] leading-relaxed opacity-75">{item.subtitle}</p>}
      {item.content && <div className="mt-2">{item.content}</div>}
    </article>
  );
}

const toneClass: Record<NonNullable<TimetableItem['tone']>, string> = {
  primary: 'border-primary/25 bg-primary/8 text-primary-deep',
  success: 'border-lime-500/30 bg-lime-50 text-lime-900',
  warning: 'border-orange-300 bg-orange-50 text-orange-950',
  danger: 'border-red-200 bg-red-50 text-red-900',
  neutral: 'border-line bg-canvas text-ink',
};

export function WeeklyTimetable({ items, emptyText = 'Chưa có lịch trong ngày này.' }: { items: TimetableItem[]; emptyText?: string }) {
  const datedItems = items.filter((item): item is TimetableItem & { date: string } => Boolean(item.date));
  const weeks = [...new Set(datedItems.map((item) => localDateKey(mondayOf(item.date))))].sort();
  const [weekPage, setWeekPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(weeks.length / WEEKS_PER_PAGE));
  const visiblePage = Math.min(weekPage, totalPages - 1);

  if (datedItems.length === items.length && datedItems.length > 0) {
    const firstWeekIndex = visiblePage * WEEKS_PER_PAGE;
    const visibleWeeks = weeks.slice(firstWeekIndex, firstWeekIndex + WEEKS_PER_PAGE);
    return (
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-3 py-3 sm:px-4">
          <p className="text-sm font-bold text-ink">
            Tuần {firstWeekIndex + 1}–{Math.min(firstWeekIndex + WEEKS_PER_PAGE, weeks.length)}
            <span className="ml-1 font-medium text-muted">/ {weeks.length}</span>
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2" aria-label="Điều hướng lịch theo tuần">
              <button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-white text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35" aria-label="Xem 4 tuần trước" onClick={() => setWeekPage(Math.max(0, visiblePage - 1))} disabled={visiblePage === 0}>
                <CaretLeft weight="bold" aria-hidden="true" />
              </button>
              <span className="min-w-16 text-center text-xs font-bold tabular-nums text-muted">{visiblePage + 1} / {totalPages}</span>
              <button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-white text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35" aria-label="Xem 4 tuần tiếp theo" onClick={() => setWeekPage(Math.min(totalPages - 1, visiblePage + 1))} disabled={visiblePage >= totalPages - 1}>
                <CaretRight weight="bold" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
          <div className="grid grid-cols-[82px_repeat(7,minmax(88px,1fr))] border-b border-line bg-canvas text-center text-xs font-extrabold uppercase tracking-wide text-ink">
            <div className="px-3 py-3 text-left text-muted">Tuần</div>
            {DAYS.map((day) => <div key={day.value} className="border-l border-line px-3 py-3">{day.label}</div>)}
          </div>
          {visibleWeeks.map((weekKey, pageWeekIndex) => {
            const weekStart = new Date(`${weekKey}T00:00:00`);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return (
              <section key={weekKey} className="grid grid-cols-[82px_repeat(7,minmax(88px,1fr))] border-b border-line last:border-b-0">
                <div className="bg-canvas/70 px-3 py-4">
                  <p className="text-xs font-extrabold text-primary">Tuần {firstWeekIndex + pageWeekIndex + 1}</p>
                  <p className="mt-1 text-[11px] font-semibold tabular-nums text-muted">{shortDate(weekStart)}–{shortDate(weekEnd)}</p>
                </div>
                {DAYS.map((day) => {
                  const dayItems = datedItems.filter((item) => item.dayOfWeek === day.value && localDateKey(mondayOf(item.date)) === weekKey);
                  return (
                    <div key={day.value} className="min-h-36 border-l border-line p-2">
                      {dayItems.length ? <div className="space-y-2">{dayItems.map((item) => <ScheduleCard key={item.id} item={item} />)}</div> : <div className="grid h-full min-h-28 place-items-center"><span className="h-1.5 w-1.5 rounded-full bg-line" aria-label={emptyText} /></div>}
                    </div>
                  );
                })}
              </section>
            );
          })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <div className="grid min-w-[980px] grid-cols-7 divide-x divide-line">
        {DAYS.map((day) => {
          const dayItems = items.filter((item) => item.dayOfWeek === day.value);
          return (
            <section key={day.value} className="min-h-52">
              <h3 className="sticky top-0 z-[1] border-b border-line bg-canvas/95 px-3 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-ink backdrop-blur">{day.label}</h3>
              <div className="space-y-2 p-2.5">
                {dayItems.length ? dayItems.map((item) => <ScheduleCard key={item.id} item={item} />) : <p className="px-1 py-4 text-center text-[11px] leading-relaxed text-muted">{emptyText}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
