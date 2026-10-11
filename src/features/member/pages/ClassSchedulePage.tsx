import { CaretLeft, CaretRight, Clock, MapPin, Star, User } from '@phosphor-icons/react';
import { Rail } from '@lucasmarkes/hairline/react';
import { useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { classSchedules, coachAvailability } from '../mockData';
import type { ClassSchedule, ClassType } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';

const days = ['Tất cả', 'Th 2', 'Th 4', 'Th 5', 'Th 6'];
const sports = ['Tất cả', 'Bơi lội', 'Gym', 'Yoga', 'Cầu lông'];

export function ClassSchedulePage() {
  const reducedMotion = useReducedMotion();
  const [day, setDay] = useState('Tất cả');
  const [sport, setSport] = useState('Tất cả');
  const [type, setType] = useState<'ALL' | ClassType>('ALL');
  const [selected, setSelected] = useState<ClassSchedule>(classSchedules[0]);

  const filtered = useMemo(() => classSchedules.filter((item) =>
    (day === 'Tất cả' || item.dayLabel === day) &&
    (sport === 'Tất cả' || item.sport === sport) &&
    (type === 'ALL' || item.type === type)
  ), [day, sport, type]);

  return (
    <div className="schedule-page">
      <header className="schedule-page__hero">
        <div><h1>Lịch tập của bạn, theo cách bạn muốn</h1><p>Tìm lớp nhóm hoặc lịch 1–1 phù hợp trong tuần này.</p></div>
        <div className="schedule-page__hairline" aria-hidden="true"><Rail intensity={0.15} theme="light" play={!reducedMotion} label="Đồ họa chuyển động trang trí" /></div>
      </header>

      <section className="schedule-toolbar" aria-label="Bộ lọc lịch lớp">
        <div className="week-switcher"><button aria-label="Tuần trước"><CaretLeft /></button><span>12 – 18 tháng 10, 2026</span><button aria-label="Tuần sau"><CaretRight /></button></div>
        <label>Ngày<select aria-label="Lọc theo ngày" value={day} onChange={(event) => setDay(event.target.value)}>{days.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Môn<select aria-label="Lọc theo môn" value={sport} onChange={(event) => setSport(event.target.value)}>{sports.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="type-filter" role="group" aria-label="Loại hình">
          {[['ALL', 'Tất cả'], ['GROUP', 'Lớp nhóm'], ['PRIVATE', '1–1']].map(([value, label]) => <button key={value} className={type === value ? 'active' : ''} onClick={() => setType(value as 'ALL' | ClassType)}>{label}</button>)}
        </div>
      </section>

      <div className="schedule-workspace">
        <section className="week-calendar" aria-label="Danh sách lịch tuần">
          <div className="week-calendar__head"><span>Thời gian</span>{['Th 2 · 12', 'Th 3 · 13', 'Th 4 · 14', 'Th 5 · 15', 'Th 6 · 16'].map((item) => <span key={item}>{item}</span>)}</div>
          <div className="week-calendar__body">
            {['06:00', '09:00', '15:00', '18:00', '19:00'].map((time) => <span key={time} className="calendar-time">{time}</span>)}
            {filtered.length ? filtered.map((item) => {
              const column = { 'Th 2': 2, 'Th 4': 4, 'Th 5': 5, 'Th 6': 6 }[item.dayLabel] ?? 3;
              const row = { '06:00': 1, '09:00': 2, '15:00': 3, '18:00': 4, '19:00': 5 }[item.startTime] ?? 2;
              return <button key={item.id} className={`calendar-event calendar-event--${item.sport.toLowerCase().replace(' ', '-')}`} style={{ gridColumn: column, gridRow: row }} onClick={() => setSelected(item)}><b>{item.title}</b><span>{item.startTime} · {item.room}</span></button>;
            }) : <p className="calendar-empty">Không có lịch phù hợp bộ lọc.</p>}
          </div>
        </section>

        <aside className="schedule-detail" aria-live="polite">
          <span>Buổi được chọn</span>
          <img src={selected.image} alt={selected.sport} />
          <div><StatusBadge status={selected.status} /><h2>{selected.title}</h2><p>{selected.type === 'GROUP' ? 'Lớp nhóm' : 'Khóa 1–1'}</p></div>
          <ul><li><Clock /> {selected.dayLabel}, {selected.startTime} – {selected.endTime}</li><li><MapPin /> {selected.room}</li><li><User /> {selected.coach}</li></ul>
          <p className="schedule-capacity">{selected.booked}/{selected.capacity} chỗ đã được đăng ký</p>
          <button disabled={selected.status === 'FULL' || selected.status === 'REGISTERED'}>{selected.status === 'FULL' ? 'Lớp đã đầy' : selected.status === 'REGISTERED' ? 'Bạn đã đăng ký' : 'Đăng ký lịch này'}</button>
        </aside>
      </div>

      <section className="available-section"><header><h2>Coach 1–1 đang khả dụng</h2><p>Chọn Coach và thống nhất một lịch học cố định cho toàn khóa.</p></header><div>{coachAvailability.map((coach) => <article key={coach.id}><img src={coach.avatar} alt={coach.name} /><div><h3>{coach.name}</h3><p>{coach.sport}</p><span><Star weight="fill" /> {coach.rating}</span></div><time>{coach.nextAvailable}</time><button>Xem lịch</button></article>)}</div></section>
      <p className="member-demo-note">Dữ liệu trên trang đang là dữ liệu minh họa.</p>
    </div>
  );
}
