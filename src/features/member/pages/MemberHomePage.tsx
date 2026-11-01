import { ArrowRight, CalendarDots, CaretLeft, CaretRight, Clock, CreditCard, MapPin, User, UsersThree } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SportLoading } from '../../../components/feedback/SportLoading';
import { useMemberHome } from '../../content/hooks';
import { sportImageUrl } from '../sportImages';

const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function MemberHomePage() {
  const home = useMemberHome();
  const [recommendationGroup, setRecommendationGroup] = useState(0);

  const recommendationCount = home.data?.recommendations.length ?? 0;
  // Mỗi nhịp dịch một lớp lên vị trí nổi bật, nhưng luôn giữ nguyên bố cục 3 lớp.
  const recommendationGroups = Math.max(1, recommendationCount);
  useEffect(() => {
    if (recommendationGroups < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setRecommendationGroup((current) => (current + 1) % recommendationGroups), 6000);
    return () => window.clearInterval(timer);
  }, [recommendationGroups]);

  if (home.isPending) return <SportLoading title="Đang chuẩn bị lịch của bạn" description="Các buổi học, Coach và hoạt động mới nhất đang được đồng bộ." />;
  if (home.isError) return <section className="member-data-state"><h1>Chưa thể tải trang chủ</h1><p>Dữ liệu hội viên chưa sẵn sàng.</p><button type="button" onClick={() => home.refetch()}>Thử lại</button></section>;

  const { profile, nextSession, weekSchedule, recommendations, activities } = home.data;
  const visibleRecommendations = recommendations.length
    ? Array.from({ length: Math.min(3, recommendations.length) }, (_, offset) => recommendations[(recommendationGroup + offset) % recommendations.length])
    : [];
  const emptyHeroImage = sportImageUrl(recommendations[0]?.sport ?? { name: 'Bơi lội' });
  return (
    <div className="member-home member-home--landing">
      {nextSession ? <section className={`member-home-hero ${nextSession.sport.imageUrl ? '' : 'member-home-hero--no-image'}`}>
        {nextSession.sport.imageUrl && <img className="member-home-hero__image" src={nextSession.sport.imageUrl} alt={`Lớp ${nextSession.sport.name}`} fetchPriority="high" />}
        <div className="member-home-hero__overlay" />
        <div className="member-home-hero__content">
          <p className="member-home-hero__welcome">Xin chào, {profile.displayName}</p>
          <span className="member-home-hero__label">Buổi học tiếp theo</span>
          <h1>{nextSession.className}</h1>
          <ul>
            <li><Clock /> {date(nextSession.startsAt)}, {time(nextSession.startsAt)} – {time(nextSession.endsAt)}</li>
            <li><MapPin /> {nextSession.room.name}</li>
            <li><User /> {nextSession.coach.displayName}</li>
          </ul>
          <div className="member-home-hero__actions">
            <Link className="member-home-hero__primary" to={`/member/classes/${nextSession.classId}`}>Xem chi tiết <ArrowRight /></Link>
            <Link className="member-home-hero__secondary" to="/member/classes">Khám phá lớp khác</Link>
          </div>
        </div>
      </section> : <section className="member-home-empty-hero">
        <img className="member-home-empty-hero__image" src={emptyHeroImage} alt="Không gian tập luyện Sportigo" fetchPriority="high" />
        <div className="member-home-empty-hero__overlay" />
        <div><h1>Xin chào, {profile.displayName}</h1><p>Bạn chưa có buổi học sắp tới. Khám phá các lớp đang mở để bắt đầu.</p><Link to="/member/classes">Khám phá lịch lớp <ArrowRight /></Link></div>
      </section>}

      <section className="member-week-rail" aria-labelledby="member-week-heading">
        <header><div><h2 id="member-week-heading">Tuần này của bạn</h2><p>{weekSchedule.length ? `${weekSchedule.length} buổi học đã được xác nhận.` : 'Chưa có buổi học trong 7 ngày tới.'}</p></div><Link to="/member/my-schedule">Mở lịch của tôi <ArrowRight /></Link></header>
        {weekSchedule.length ? <div className="member-week-rail__items">{weekSchedule.slice(0, 3).map((item) => (
          <article key={item.sessionId}>
            <time dateTime={item.startsAt}><span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(item.startsAt))}</span><b>{new Date(item.startsAt).getDate()}</b></time>
            <div><span>{item.sport.name}</span><h3>{item.className}</h3><p>{time(item.startsAt)} – {time(item.endsAt)} · {item.room.name}</p></div>
          </article>
        ))}</div> : <div className="member-inline-empty">Không có lịch học nào trong tuần này.</div>}
      </section>

      <section className="member-home-showcase" aria-labelledby="discovery-heading">
        <header><div><h2 id="discovery-heading">Lớp đang mở dành cho bạn</h2><p>Đề xuất được lấy từ lịch lớp hiện tại của trung tâm.</p></div><Link to="/member/classes">Xem toàn bộ lịch <ArrowRight /></Link></header>
        {visibleRecommendations.length ? <div className="member-home-showcase__carousel">
          {recommendationGroups > 1 && <button className="member-home-showcase__arrow member-home-showcase__arrow--previous" type="button" aria-label="Xem các lớp trước" onClick={() => setRecommendationGroup((recommendationGroup - 1 + recommendationGroups) % recommendationGroups)}><CaretLeft /></button>}
          <div className="member-home-showcase__grid" aria-live="polite">
          <article className="member-home-showcase__featured">
            <img src={sportImageUrl(visibleRecommendations[0].sport)} alt={visibleRecommendations[0].sport.name} loading="lazy" /><div className="member-home-showcase__shade" /><div><span>{visibleRecommendations[0].sport.name}</span><h3>{visibleRecommendations[0].name}</h3><p>{visibleRecommendations[0].coach.user.displayName} · {time(visibleRecommendations[0].sessions[0]?.startsAt ?? visibleRecommendations[0].startDate)}</p><Link to={`/member/classes/${visibleRecommendations[0].id}`}>Xem lớp <ArrowRight /></Link></div>
          </article>
          <div className="member-home-showcase__compact">{visibleRecommendations.slice(1).map((item) => (
            <article key={item.id}><img src={sportImageUrl(item.sport)} alt={item.sport.name} loading="lazy" /><div><span>{item.sport.name}</span><h3>{item.name}</h3><p>{item.coach.user.displayName}</p><small><UsersThree /> {item._count.registrations}/{item.capacity} chỗ</small></div><Link to={`/member/classes/${item.id}`} aria-label={`Xem ${item.name}`}><ArrowRight /></Link></article>
          ))}</div>
          </div>
          {recommendationGroups > 1 && <button className="member-home-showcase__arrow member-home-showcase__arrow--next" type="button" aria-label="Xem các lớp tiếp theo" onClick={() => setRecommendationGroup((recommendationGroup + 1) % recommendationGroups)}><CaretRight /></button>}
        </div> : <div className="member-inline-empty">Chưa có lớp mới phù hợp để đề xuất.</div>}
      </section>

      <section className="member-home-activity" aria-labelledby="activity-heading">
        <header><h2 id="activity-heading">Hoạt động gần đây</h2><p>Thông báo và giao dịch thực tế từ tài khoản của bạn.</p></header>
        {activities.length ? <div>{activities.map((activity) => (
          <article key={activity.id}><span>{activity.type === 'PAYMENT' ? <CreditCard /> : <CalendarDots />}</span><div><h3>{activity.title}</h3><p>{activity.description}</p></div><time dateTime={activity.occurredAt}>{date(activity.occurredAt)}</time></article>
        ))}</div> : <div className="member-inline-empty">Chưa có hoạt động gần đây.</div>}
      </section>
    </div>
  );
}
