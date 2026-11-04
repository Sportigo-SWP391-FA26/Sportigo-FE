import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const SLOTS = [
  { label: 'Ca 1', start: '07:00', end: '08:30' },
  { label: 'Ca 2', start: '09:00', end: '10:30' },
  { label: 'Ca 3', start: '11:00', end: '12:30' },
  { label: 'Ca 4', start: '13:30', end: '15:00' },
  { label: 'Ca 5', start: '15:30', end: '17:00' },
  { label: 'Ca 6', start: '17:30', end: '19:00' },
  { label: 'Ca 7', start: '19:30', end: '21:00' },
];

export type MemberWeekCalendarItem = {
  id: string | number;
  startsAt: string;
  endsAt: string;
  title: string;
  subtitle: string;
  tone: 'group' | 'private' | 'changed' | 'cancelled';
  content?: ReactNode;
};

const startOfMonday = (value: Date) => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
};

const addDays = (value: Date, amount: number) => {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
};

const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const shortDate = (value: Date) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(value);
const fullDate = (value: Date) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
const time = (value: string) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const minutes = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};
const slotIndexFor = (value: string) => {
  const date = new Date(value);
  const startMinutes = date.getHours() * 60 + date.getMinutes();
  return SLOTS.reduce((best, slot, index) => (
    Math.abs(startMinutes - minutes(slot.start)) < Math.abs(startMinutes - minutes(SLOTS[best].start)) ? index : best
  ), 0);
};

export function MemberWeekCalendar({ items, focusDate }: { items: MemberWeekCalendarItem[]; focusDate?: string }) {
  const firstRelevantDate = focusDate ? new Date(focusDate) : items[0]?.startsAt ? new Date(items[0].startsAt) : new Date();
  const [weekStart, setWeekStart] = useState(() => startOfMonday(firstRelevantDate));
  const today = new Date();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const weekEnd = days[6];
  const weekItems = items.filter((item) => {
    const startsAt = new Date(item.startsAt);
    return startsAt >= weekStart && startsAt < addDays(weekStart, 7);
  });
  return (
    <section className="member-week-calendar" aria-label={`Lịch tuần ${fullDate(weekStart)} đến ${fullDate(weekEnd)}`}>
      <header className="member-week-calendar__toolbar">
        <div>
          <span>LỊCH THEO TUẦN</span>
          <h3>{shortDate(weekStart)} – {fullDate(weekEnd)}</h3>
        </div>
        <div className="member-week-calendar__navigation">
          <button type="button" onClick={() => setWeekStart(startOfMonday(today))}>Hôm nay</button>
          <button type="button" aria-label="Xem tuần trước" onClick={() => setWeekStart((current) => addDays(current, -7))}><CaretLeft weight="bold" /></button>
          <button type="button" aria-label="Xem tuần tiếp theo" onClick={() => setWeekStart((current) => addDays(current, 7))}><CaretRight weight="bold" /></button>
        </div>
      </header>

      <div className="member-week-calendar__viewport">
        <div className="member-week-calendar__canvas">
          <div className="member-week-calendar__corner" />
          {days.map((day, index) => {
            const isToday = dateKey(day) === dateKey(today);
            return <div key={dateKey(day)} className={`member-week-calendar__day ${isToday ? 'is-today' : ''}`}><span>{DAYS[index]}</span><b>{day.getDate()}</b></div>;
          })}

          {SLOTS.flatMap((slot, slotIndex) => [
            <div key={`${slot.label}-label`} className="member-week-calendar__slot"><b>{slot.label}</b><span>{slot.start}–{slot.end}</span></div>,
            ...days.map((day) => {
              const cellItems = weekItems.filter((item) => dateKey(new Date(item.startsAt)) === dateKey(day) && slotIndexFor(item.startsAt) === slotIndex);
              return (
                <div key={`${slot.label}-${dateKey(day)}`} className={`member-week-calendar__cell ${dateKey(day) === dateKey(today) ? 'is-today' : ''}`}>
                  {cellItems.map((item) => (
                    <article key={item.id} className={`member-week-calendar__event is-${item.tone}`}>
                      <time>{time(item.startsAt)}–{time(item.endsAt)}</time>
                      <h4>{item.title}</h4>
                      <p>{item.subtitle}</p>
                      {item.content}
                    </article>
                  ))}
                </div>
              );
            }),
          ])}
        </div>
        {weekItems.length === 0 && <div className="member-week-calendar__empty">Tuần này chưa có buổi học đã xác nhận.</div>}
      </div>
    </section>
  );
}
