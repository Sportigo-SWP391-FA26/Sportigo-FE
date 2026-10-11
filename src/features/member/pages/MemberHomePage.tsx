import { ArrowRight, CalendarDots, Clock, CreditCard, MapPin, User, UsersThree } from '@phosphor-icons/react';
import { Terrain } from '@lucasmarkes/hairline/react';
import { Link } from 'react-router-dom';
import { classSchedules, memberProfile, recentActivities } from '../mockData';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function MemberHomePage() {
  const reducedMotion = useReducedMotion();
  const nextClass = classSchedules[0];
  const discovery = classSchedules.filter((item) => ['Yoga', 'Gym', 'Cầu lông'].includes(item.sport));
  const week = [classSchedules[0], classSchedules[2], classSchedules[3]];

  return (
    <div className="member-home member-home--landing">
      <section className="member-home-hero">
        <img className="member-home-hero__image" src={nextClass.image} alt="Vận động viên bơi trong hồ bơi trong nhà" fetchPriority="high" />
        <div className="member-home-hero__overlay" />
        <div className="member-home-hero__content">
          <p className="member-home-hero__welcome">Chào buổi sáng, {memberProfile.name.split(' ').slice(-2).join(' ')}</p>
          <span className="member-home-hero__label">Buổi học tiếp theo</span>
          <h1>{nextClass.title}</h1>
          <ul>
            <li><Clock /> {nextClass.dayLabel}, {nextClass.startTime} – {nextClass.endTime}</li>
            <li><MapPin /> {nextClass.room}</li>
            <li><User /> {nextClass.coach}</li>
          </ul>
          <div className="member-home-hero__actions">
            <Link className="member-home-hero__primary" to="/member/classes">Xem chi tiết <ArrowRight /></Link>
            <Link className="member-home-hero__secondary" to="/member/classes">Khám phá lớp khác</Link>
          </div>
        </div>
      </section>

      <section className="member-week-rail" aria-labelledby="member-week-heading">
        <div className="member-week-rail__hairline" aria-hidden="true"><Terrain intensity={0.16} theme="dark" play={!reducedMotion} label="Đồ họa chuyển động trang trí" /></div>
        <header><div><h2 id="member-week-heading">Tuần này của bạn</h2><p>Ba buổi học đang chờ phía trước.</p></div><Link to="/member/my-schedule">Mở lịch của tôi <ArrowRight /></Link></header>
        <div className="member-week-rail__items">{week.map((item) => (
          <article key={item.id}>
            <time dateTime={item.date}><span>{item.dayLabel}</span><b>{new Date(`${item.date}T00:00:00`).getDate()}</b></time>
            <div><span>{item.sport}</span><h3>{item.title}</h3><p>{item.startTime} – {item.endTime} · {item.room}</p></div>
          </article>
        ))}</div>
      </section>

      <section className="member-home-showcase" aria-labelledby="discovery-heading">
        <header><div><h2 id="discovery-heading">Khám phá nhịp tập tiếp theo</h2><p>Chọn một trải nghiệm phù hợp với năng lượng của bạn.</p></div><Link to="/member/classes">Xem toàn bộ lịch <ArrowRight /></Link></header>
        <div className="member-home-showcase__grid">
          <article className="member-home-showcase__featured">
            <img src={discovery[0].image} alt={discovery[0].sport} loading="lazy" /><div className="member-home-showcase__shade" /><div><span>{discovery[0].sport}</span><h3>{discovery[0].title}</h3><p>{discovery[0].coach} · {discovery[0].startTime}</p><Link to="/member/classes">Xem lớp <ArrowRight /></Link></div>
          </article>
          <div className="member-home-showcase__compact">{discovery.slice(1).map((item) => (
            <article key={item.id}><img src={item.image} alt={item.sport} loading="lazy" /><div><span>{item.sport}</span><h3>{item.title}</h3><p>{item.coach} · {item.startTime}</p><small><UsersThree /> {item.booked}/{item.capacity} chỗ</small></div><Link to="/member/classes" aria-label={`Xem ${item.title}`}><ArrowRight /></Link></article>
          ))}</div>
        </div>
      </section>

      <section className="member-home-activity" aria-labelledby="activity-heading">
        <header><h2 id="activity-heading">Hoạt động gần đây</h2><p>Những cập nhật quan trọng cho hành trình của bạn.</p></header>
        <div>{recentActivities.map((activity) => (
          <article key={activity.id}><span>{activity.type === 'PAYMENT' ? <CreditCard /> : <CalendarDots />}</span><div><h3>{activity.title}</h3><p>{activity.description}</p></div><time>{activity.time}</time></article>
        ))}</div>
      </section>
      <p className="member-demo-note member-home__demo-note">Dữ liệu trên trang đang là dữ liệu minh họa.</p>
    </div>
  );
}
