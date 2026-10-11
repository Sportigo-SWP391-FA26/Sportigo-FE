import { useEffect, useState } from 'react'
import { ArrowRight, CaretLeft, CaretRight, Check, Clock, EnvelopeSimple, FacebookLogo, InstagramLogo, MapPin, Phone, Sparkle, UsersThree, YoutubeLogo } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'

const heroSlides = [
  { name: 'Bơi lội', image: '/images/landing/hero/swimming.webp' },
  { name: 'Gym', image: '/images/landing/hero/gym.webp' },
  { name: 'Yoga', image: '/images/landing/hero/yoga.webp' },
  { name: 'Cầu lông', image: '/images/landing/hero/badminton.webp' },
]
const facilities = [
  ['Hồ bơi Olympic', 'Bể bơi nước ấm tiêu chuẩn 50m', heroSlides[0].image],
  ['Gym & Thể lực', 'Không gian tập luyện hiện đại', heroSlides[1].image],
  ['Yoga Studio', 'Không gian cân bằng và phục hồi', heroSlides[2].image],
  ['Cầu lông trong nhà', 'Mặt sân chuyên dụng, ánh sáng chuẩn', heroSlides[3].image],
]
const classes = [
  { time: '06:00', name: 'Swimming Endurance', sport: 'Bơi lội', coach: 'HLV Linh Nguyễn', room: 'Hồ bơi Olympic', capacity: '12/20', image: heroSlides[0].image },
  { time: '08:30', name: 'Functional Strength', sport: 'Gym', coach: 'HLV Minh Trần', room: 'Studio Strength', capacity: '16/18', image: heroSlides[1].image },
  { time: '17:30', name: 'Badminton Foundation', sport: 'Cầu lông', coach: 'HLV Huy Lê', room: 'Sân cầu lông 02', capacity: '8/12', image: heroSlides[3].image },
  { time: '19:00', name: 'Yoga Recovery', sport: 'Yoga', coach: 'HLV An Phạm', room: 'Mind & Body', capacity: '14/20', image: heroSlides[2].image },
]
// Dữ liệu HLV minh họa cho giao diện, không đại diện cho người thật.
const coaches = [
  { name: 'Linh Nguyễn', sport: 'Bơi lội', credential: 'ASCA Level 2 · Kỹ thuật đường dài', image: '/images/landing/coaches/linh-nguyen.webp' },
  { name: 'Minh Trần', sport: 'Gym & Thể lực', credential: 'NSCA-CPT · Strength & Conditioning', image: '/images/landing/coaches/minh-tran.webp' },
  { name: 'An Phạm', sport: 'Yoga', credential: 'RYT 500 · Mobility & Recovery', image: '/images/landing/coaches/an-pham.webp' },
  { name: 'Huy Lê', sport: 'Cầu lông', credential: 'BWF Level 1 · Kỹ thuật thi đấu', image: '/images/landing/coaches/huy-le.webp' },
  { name: 'Mai Võ', sport: 'Functional Fitness', credential: 'NASM-CPT · Functional Training', image: '/images/landing/coaches/mai-vo.webp' },
  { name: 'Quốc Bùi', sport: 'Aquatics & Mobility', credential: 'AUSTSWIM · Mobility Coaching', image: '/images/landing/coaches/quoc-bui.webp' },
]
const plans = [
  { name: 'Sportigo Active', price: '1.350.000đ', note: 'Dành cho nhịp sống năng động', items: ['Gym không giới hạn', 'Hồ bơi 12 lượt/tháng', '2 lớp nhóm/tuần'] },
  { name: 'Sportigo Elite Pro', price: '2.450.000đ', note: 'Lựa chọn được yêu thích nhất', featured: true, items: ['Toàn bộ 4 bộ môn', 'Lớp nhóm không giới hạn', 'Đo InBody định kỳ'] },
  { name: 'Diamond Privilege', price: '4.800.000đ', note: 'Huấn luyện và phục hồi riêng', items: ['HLV cá nhân 1:1', 'Hydrotherapy chuyên sâu', 'Ưu tiên đặt lịch'] },
]
const partners = [
  { name: 'Nike', logo: '/brands/nike.svg', wordmark: 'NIKE', slug: 'nike' },
  { name: 'Adidas', logo: '/brands/adidas.svg', wordmark: 'adidas', slug: 'adidas' },
  { name: 'Puma', logo: '/brands/puma.svg', wordmark: 'PUMA', slug: 'puma' },
  { name: 'Under Armour', logo: '/brands/underarmour.svg', wordmark: 'UNDER ARMOUR', slug: 'under-armour' },
  { name: 'ASICS', logo: '/brands/asics.svg', slug: 'asics' },
  { name: 'New Balance', logo: '/brands/newbalance.svg', wordmark: 'new balance', slug: 'new-balance' },
  { name: 'Reebok', logo: '/brands/reebok.svg', wordmark: 'Reebok', slug: 'reebok' },
]
const days = ['Thứ 2 · Hôm nay', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

function useAutoAdvance(length: number, delay = 6000) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % length), delay)
    return () => window.clearInterval(timer)
  }, [delay, length])
  return [index, setIndex] as const
}

export function LandingPage() {
  const [heroIndex, setHeroIndex] = useAutoAdvance(heroSlides.length)
  const [coachGroup, setCoachGroup] = useAutoAdvance(2)
  const [activeDay, setActiveDay] = useState(0)
  const visibleCoaches = coaches.slice(coachGroup * 3, coachGroup * 3 + 3)
  const toggleCoachGroup = () => setCoachGroup(coachGroup === 0 ? 1 : 0)
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__slides" aria-hidden="true">{heroSlides.map((slide, index) => <div className={`landing-hero__slide ${index === heroIndex ? 'is-active' : ''}`} style={{ backgroundImage: `url(${slide.image})` }} key={slide.name} />)}</div>
        <div className="landing-hero__overlay" />
        <header className="landing-nav">
          <BrandLogo className="landing-logo" />
          <nav aria-label="Điều hướng chính"><a href="#facilities">Không gian</a><a href="#schedule">Lịch tập</a><a href="#memberships">Hạng thẻ</a><a href="#coaches">Huấn luyện viên</a></nav>
          <div className="landing-nav__actions"><a href="tel:19006868"><Phone />1900 6868</a><Link to="/login">Đăng nhập</Link></div>
        </header>
        <div className="landing-hero__body"><div className="landing-hero__copy">
          <span className="landing-location"><MapPin /> Sportigo Athletic Club · TP.HCM</span>
          <h1>Bứt phá giới hạn.<br />Cùng Sportigo.</h1>
          <p>Trải nghiệm tổ hợp thể thao đa môn chuẩn quốc tế, nơi mỗi buổi tập là một bước tiến đến phiên bản tốt hơn của bạn.</p>
          <div className="landing-hero__buttons"><Link className="button button--primary" to="/register">Đăng ký tập thử <ArrowRight /></Link><a className="button button--glass" href="#facilities">Khám phá không gian</a></div>
          <div className="hero-controls" role="group" aria-label="Chọn ảnh giới thiệu">{heroSlides.map((slide, index) => <button type="button" className={index === heroIndex ? 'active' : ''} aria-pressed={index === heroIndex} onClick={() => setHeroIndex(index)} key={slide.name}><span>{String(index + 1).padStart(2, '0')}</span>{slide.name}</button>)}</div>
        </div></div>
        <div className="hero-stats"><span><b>15.000+</b>Hội viên tin chọn</span><span><b>350+</b>Lớp mỗi tuần</span><span><b>10.000m²</b>Không gian luyện tập</span><span><b>04</b>Bộ môn chuyên biệt</span></div>
      </section>

      <section className="section section--white section--overflow" id="facilities">
        <div className="section-heading"><div><h2>Không Gian Thể Thao Đỉnh Cao</h2></div><span>Chuẩn thi đấu quốc tế · Thiết bị thế hệ mới · Vận hành an toàn</span></div>
        <div className="facility-marquee"><div className="facility-track">{[...facilities, ...facilities].map(([title, desc, image], index) => <article className="facility-card" key={`${title}-${index}`}><img src={image} alt={index < facilities.length ? title : ''} loading="lazy" /><div><span>SPORTIGO</span><h3>{title}</h3><p>{desc}</p></div></article>)}</div></div>
      </section>

      <section className="section" id="schedule">
        <div className="schedule-heading"><div><h2>Chọn lớp phù hợp với nhịp sống của bạn</h2><p>Từ buổi sáng tràn năng lượng đến những lớp phục hồi cuối ngày.</p></div><Link to="/register">Xem toàn bộ lịch <ArrowRight /></Link></div>
        <div className="schedule-days" role="tablist" aria-label="Chọn ngày tập">{days.map((day, index) => <button type="button" role="tab" aria-selected={index === activeDay} className={index === activeDay ? 'active' : ''} onClick={() => setActiveDay(index)} key={day}>{day}</button>)}</div>
        <div className="schedule-showcase">
          <article className="schedule-featured"><img src={classes[0].image} alt={`Lớp ${classes[0].sport}`} loading="lazy" /><div className="schedule-featured__shade" /><div className="schedule-featured__content"><div><span>{classes[0].sport}</span><time>{classes[0].time}</time></div><h3>{classes[0].name}</h3><p>{classes[0].coach} · <MapPin /> {classes[0].room}</p><div><span><UsersThree /> {classes[0].capacity} chỗ</span><Link to="/register">Đặt lớp <ArrowRight /></Link></div></div></article>
          <div className="schedule-compact">{classes.slice(1).map((item) => <article key={item.name}><img src={item.image} alt={`Lớp ${item.sport}`} loading="lazy" /><div><span>{item.sport}</span><h3>{item.name}</h3><p>{item.coach}</p><small><time>{item.time}</time> · {item.room} · {item.capacity} chỗ</small></div><Link to="/register" aria-label={`Đặt lớp ${item.name}`}><ArrowRight /></Link></article>)}</div>
        </div>
      </section>

      <section className="section section--white" id="memberships"><div className="section-heading section-heading--center"><div><p>CHỌN HÀNH TRÌNH CỦA BẠN</p><h2>Hạng Thẻ Hội Viên Sportigo</h2></div></div><div className="plan-grid">{plans.map((plan) => <article className={`plan ${plan.featured ? 'plan--featured' : ''}`} key={plan.name}>{plan.featured && <span className="plan__badge"><Sparkle /> PHỔ BIẾN NHẤT</span>}<h3>{plan.name}</h3><p>{plan.note}</p><strong>{plan.price}<small>/ tháng</small></strong><ul>{plan.items.map((item) => <li key={item}><Check />{item}</li>)}</ul><Link to="/register">Chọn hạng thẻ <ArrowRight /></Link></article>)}</div></section>

      <section className="section coaches" id="coaches">
        <div className="section-heading"><div><p>ĐỘI NGŨ CHUYÊN GIA</p><h2>Huấn luyện đúng phương pháp</h2></div><span>Hồ sơ và hình ảnh minh họa</span></div>
        <div className="coach-carousel" aria-live="polite">{visibleCoaches.map((coach, index) => <article className={`coach-card ${index === 1 ? 'coach-card--featured' : ''}`} key={coach.name}><img src={coach.image} alt={`${coach.name}, huấn luyện viên ${coach.sport}`} loading="lazy" /><div><span>{coach.sport}</span><h3>{coach.name}</h3><p>{coach.credential}</p></div></article>)}</div>
        <div className="coach-controls"><button type="button" aria-label="Nhóm huấn luyện viên trước" onClick={toggleCoachGroup}><CaretLeft /></button><div>{[0, 1].map((group) => <button type="button" aria-label={`Xem nhóm huấn luyện viên ${group + 1}`} aria-pressed={group === coachGroup} className={group === coachGroup ? 'active' : ''} onClick={() => setCoachGroup(group)} key={group} />)}</div><button type="button" aria-label="Nhóm huấn luyện viên tiếp theo" onClick={toggleCoachGroup}><CaretRight /></button></div>
      </section>

      <section className="partner-marquee" aria-label="Các thương hiệu thể thao nổi bật"><p>Thương hiệu được tin chọn trong thể thao</p><div className="partner-marquee__viewport"><div className="partner-marquee__track">{[...partners, ...partners].map((partner, index) => <div className={`partner-logo partner-logo--${partner.slug}`} role={index < partners.length ? 'img' : undefined} aria-label={index < partners.length ? `Logo ${partner.name}` : undefined} aria-hidden={index >= partners.length} key={`${partner.name}-${index}`}><img src={partner.logo} alt="" loading="lazy" />{'wordmark' in partner && partner.wordmark && <span aria-hidden="true">{partner.wordmark}</span>}</div>)}</div></div></section>

      <footer className="landing-footer">
        <div className="footer-brand"><BrandLogo className="footer-logo" /><p>More than a workout. Nơi thể thao trở thành phong cách sống.</p><div className="footer-social"><a href="#instagram" aria-label="Instagram"><InstagramLogo /></a><a href="#facebook" aria-label="Facebook"><FacebookLogo /></a><a href="#youtube" aria-label="YouTube"><YoutubeLogo /></a></div></div>
        <div className="footer-column"><h3>Khám phá</h3><a href="#facilities">Không gian</a><a href="#schedule">Lịch tập</a><a href="#memberships">Hạng thẻ</a><a href="#coaches">Huấn luyện viên</a></div>
        <div className="footer-column"><h3>Liên hệ</h3><a href="tel:19006868"><Phone />1900 6868</a><span><Clock />05:30 – 22:30</span><span><MapPin />TP. Hồ Chí Minh</span></div>
        <form className="footer-newsletter" onSubmit={(event) => event.preventDefault()}><h3>Nhận tin từ Sportigo</h3><p>Lịch lớp mới và ưu đãi dành riêng cho hội viên.</p><label><span className="sr-only">Địa chỉ email</span><input type="email" placeholder="Email của bạn" aria-label="Địa chỉ email" /><button type="submit" aria-label="Đăng ký nhận tin"><EnvelopeSimple /></button></label></form>
        <div className="footer-bottom"><small>© 2026 Sportigo Athletic Facility.</small><div><a href="#privacy">Chính sách bảo mật</a><a href="#terms">Điều khoản sử dụng</a></div></div>
      </footer>
    </div>
  )
}
