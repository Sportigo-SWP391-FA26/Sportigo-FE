import { ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { ClassSchedule } from '../types';

export function WeeklyAgenda({ schedules }: { schedules: ClassSchedule[] }) {
  return (
    <section className="member-agenda" aria-labelledby="week-heading">
      <header><h2 id="week-heading">Tuần này</h2><Link to="/member/my-schedule">Mở lịch của tôi <ArrowRight /></Link></header>
      <div>
        {schedules.slice(0, 3).map((item) => (
          <article key={item.id}>
            <time dateTime={item.date}><span>{item.dayLabel}</span><b>{new Date(`${item.date}T00:00:00`).getDate()}</b></time>
            <div><h3>{item.title}</h3><p>{item.startTime} – {item.endTime} <i /> {item.room}</p></div>
            <span className={`agenda-dot agenda-dot--${item.status.toLowerCase()}`} />
          </article>
        ))}
      </div>
    </section>
  );
}
