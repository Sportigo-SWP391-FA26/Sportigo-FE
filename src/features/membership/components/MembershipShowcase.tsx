import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { money, type MembershipPlan } from '../api';

export function MembershipShowcase({ plans, href, headingId }: { plans: MembershipPlan[]; href: string; headingId: string }) {
  return <section className="membership-showcase" aria-labelledby={headingId}>
    <div className="membership-showcase__heading">
      <div><span>PHÒNG TẬP SPORTIGO</span><h2 id={headingId}>Chọn gói tập dành cho bạn</h2><p>Tự do sử dụng phòng tập trong thời hạn gói. Lớp nhóm và Coach được đăng ký riêng.</p></div>
      <Link to={href}>Khám phá gói tập <ArrowRight aria-hidden="true" /></Link>
    </div>
    <div className="membership-showcase__grid">{plans.map((plan) => <article className="membership-showcase__card" key={plan.id}>
      {plan.imageUrl && <img src={plan.imageUrl} alt={`Không gian tập luyện của ${plan.name}`} loading="lazy" />}
      <div className="membership-showcase__body">
        <span className="membership-showcase__duration">{plan.durationMonths} THÁNG</span>
        <h3>{plan.name}</h3><p>{plan.description}</p>
        <div className="membership-showcase__benefit"><CheckCircle weight="fill" aria-hidden="true" /> Không giới hạn lượt vào phòng tập</div>
        <div className="membership-showcase__foot"><strong>{money(plan.price)}</strong><Link to={href} aria-label={`Xem và đăng ký ${plan.name}`}><ArrowRight aria-hidden="true" /></Link></div>
      </div>
    </article>)}</div>
  </section>;
}
