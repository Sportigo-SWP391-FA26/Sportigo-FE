import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, CaretLeft, CaretRight, Clock, EnvelopeSimple, FacebookLogo, InstagramLogo, MapPin, Phone, UsersThree, YoutubeLogo } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'
import { useNewsletter, usePublicLanding } from '../../content/hooks'
import { isClassBookable } from '../../member/bookingEligibility'

function useAutoAdvance(length: number, delay = 6000) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % length), delay)
    return () => window.clearInterval(timer)
  }, [delay, length])
  return [length ? index % length : 0, setIndex] as const
}

function formatTime(value?: string) {
  if (!value) return 'Chưa xếp lịch'
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatMoney(value: string | number) {
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()
}

function LandingInitialShell() {
  return <main className="landing-page landing-initial" aria-busy="true">
    <section className="landing-hero">
      <div className="landing-hero__slides" aria-hidden="true"><div className="landing-hero__slide is-active" style={{ backgroundImage: 'url(/images/landing/hero/swimming.webp)' }} /></div>
      <div className="landing-hero__overlay" />
      <header className="landing-nav">
        <BrandLogo className="landing-logo" />
        <nav aria-label="Điều hướng chính"><a href="#facilities">Không gian</a><a href="#schedule">Lịch tập</a><a href="#memberships">Lớp & khóa 1–1</a><a href="#coaches">Huấn luyện viên</a></nav>
        <div className="landing-nav__actions"><Link className="landing-nav__login" to="/login">Đăng nhập</Link><Link className="landing-nav__register" to="/register">Đăng ký</Link></div>
      </header>
      <div className="landing-hero__body"><div className="landing-hero__copy">
        <span className="landing-location"><MapPin /> Sportigo Athletic Club</span>
        <h1>Bứt phá giới hạn.<br />Cùng Sportigo.</h1>
        <p>Tổ hợp thể thao đa môn, nơi mỗi buổi tập là một bước tiến đến phiên bản tốt hơn của bạn.</p>
        <div className="landing-hero__buttons"><Link className="button button--primary" to="/register">Đăng ký tài khoản <ArrowRight /></Link><a className="button button--glass" href="#facilities">Khám phá không gian</a></div>
        <div className="landing-initial__progress" role="status"><span />Đang cập nhật lịch học mới nhất…</div>
      </div></div>
      <div className="hero-stats landing-initial__stats" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <span key={index}><b /><i /></span>)}</div>
    </section>
    <section className="landing-initial__below" aria-hidden="true"><span /><span /><span /></section>
  </main>
}

export function LandingPage() {
  const landing = usePublicLanding()
  const newsletter = useNewsletter()
  const [heroIndex, setHeroIndex] = useAutoAdvance(landing.data?.heroSlides.length ?? 0)
  const coachGroups = Math.max(1, Math.ceil((landing.data?.coaches.length ?? 0) / 3))
  const [coachGroup, setCoachGroup] = useAutoAdvance(coachGroups)
  const [navScrolled, setNavScrolled] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const [email, setEmail] = useState('')
  const previousScrollY = useRef(0)

  useEffect(() => {
    const updateNavigation = () => {
      const currentScrollY = window.scrollY
      const heroHeight = document.querySelector<HTMLElement>('.landing-hero')?.offsetHeight ?? 780
      setNavScrolled(currentScrollY >= heroHeight - 88)
      setNavHidden(currentScrollY > 120 && currentScrollY > previousScrollY.current)
      previousScrollY.current = currentScrollY
    }
    updateNavigation()
    window.addEventListener('scroll', updateNavigation, { passive: true })
    return () => window.removeEventListener('scroll', updateNavigation)
  }, [])

  const featured = useMemo(() => {
    if (!landing.data) return []
    const classes = landing.data.featured.groupClasses.filter((item) => isClassBookable(item)).map((item) => ({
      id: `group-${item.id}`, name: item.name, sport: item.sport.name, image: item.sport.imageUrl,
      coach: item.coach.user.displayName, time: formatTime(item.sessions[0]?.startsAt),
      room: item.sessions[0]?.room.name ?? 'Chưa xếp phòng', capacity: `${item._count.registrations}/${item.capacity}`,
      href: `/member/classes/${item.id}`, type: 'Lớp nhóm',
    }))
    const privateCourses = landing.data.featured.privateCourses.map((item) => ({
      id: `private-${item.id}`, name: item.name, sport: item.sport.name, image: item.sport.imageUrl,
      coach: item.coaches.map((entry) => entry.coach.user.displayName).join(', ') || 'Đang cập nhật Coach',
      time: `${item.totalSessions} buổi`, room: 'Lịch cố định theo tuần', capacity: '1:1',
      href: `/member/private-courses/${item.id}`, type: 'Khóa 1–1',
    }))
    return [...classes, ...privateCourses].slice(0, 4)
  }, [landing.data])

  const activeServices = useMemo(() => {
    if (!landing.data) return { groupClasses: [], privateCourses: [] }
    const groupClasses = landing.data.featured.groupClasses.filter((item) => isClassBookable(item)).map((item) => ({
      id: `active-group-${item.id}`,
      type: 'Lớp nhóm', name: item.name, sport: item.sport.name, image: item.sport.imageUrl,
      coach: item.coach.user.displayName, price: formatMoney(item.tuitionFee),
      detail: `${item._count.registrations}/${item.capacity} học viên · ${item.sessions.length ? formatTime(item.sessions[0].startsAt) : 'Chưa xếp lịch'}`,
      href: `/member/classes/${item.id}`,
    }))
    const privateCourses = landing.data.featured.privateCourses.map((item) => ({
      id: `active-private-${item.id}`,
      type: 'Khóa 1–1', name: item.name, sport: item.sport.name, image: item.sport.imageUrl,
      coach: item.coaches.map((entry) => entry.coach.user.displayName).join(', ') || 'Đang cập nhật Coach',
      price: formatMoney(item.price), detail: `${item.totalSessions} buổi · Lịch tuần cố định`,
      href: `/member/private-courses/${item.id}`,
    }))
    return { groupClasses, privateCourses }
  }, [landing.data])

  if (landing.isPending) return <LandingInitialShell />
  if (landing.isError) return <main className="public-state"><h1>Chưa thể tải trang</h1><p>Vui lòng kiểm tra kết nối và thử lại.</p><button type="button" onClick={() => landing.refetch()}>Thử lại</button></main>

  const data = landing.data
  const settings = data.settings
  const visibleCoaches = data.coaches.slice(coachGroup * 3, coachGroup * 3 + 3)
  const submitNewsletter = (event: FormEvent) => {
    event.preventDefault()
    newsletter.mutate(email, { onSuccess: () => setEmail('') })
  }

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__slides" aria-hidden="true">{data.heroSlides.map((slide, index) => <div className={`landing-hero__slide ${index === heroIndex ? 'is-active' : ''}`} style={{ backgroundImage: `url(${slide.imageUrl})` }} key={slide.id} />)}</div>
        <div className="landing-hero__overlay" />
        <header className={`landing-nav ${navScrolled ? 'landing-nav--scrolled' : ''} ${navHidden ? 'landing-nav--hidden' : ''}`}>
          <BrandLogo className="landing-logo" />
          <nav aria-label="Điều hướng chính"><a href="#facilities">Không gian</a><a href="#schedule">Lịch tập</a><a href="#memberships">Lớp & khóa 1–1</a><a href="#coaches">Huấn luyện viên</a></nav>
          <div className="landing-nav__actions"><a className="landing-nav__phone" href={`tel:${settings?.hotline.replace(/\s/g, '') ?? ''}`}><Phone />{settings?.hotline ?? 'Liên hệ'}</a><Link className="landing-nav__login" to="/login">Đăng nhập</Link><Link className="landing-nav__register" to="/register">Đăng ký</Link></div>
        </header>
        <div className="landing-hero__body"><div className="landing-hero__copy">
          <span className="landing-location"><MapPin /> Sportigo Athletic Club · {settings?.location ?? 'Đang cập nhật'}</span>
          <h1>Bứt phá giới hạn.<br />Cùng Sportigo.</h1>
          <p>{settings?.brandDescription ?? 'Thông tin thương hiệu đang được cập nhật.'}</p>
          <div className="landing-hero__buttons"><Link className="button button--primary" to="/register">Đăng ký tài khoản <ArrowRight /></Link><a className="button button--glass" href="#facilities">Khám phá không gian</a></div>
          <div className="hero-controls" role="group" aria-label="Chọn ảnh giới thiệu">{data.heroSlides.map((slide, index) => <button type="button" className={index === heroIndex ? 'active' : ''} aria-pressed={index === heroIndex} onClick={() => setHeroIndex(index)} key={slide.id}><span>{String(index + 1).padStart(2, '0')}</span>{slide.sport?.name ?? slide.title}</button>)}</div>
        </div></div>
        <div className="hero-stats"><span><b>{data.stats.activeMembers.toLocaleString('vi-VN')}</b>Hội viên hoạt động</span><span><b>{data.stats.sessionsThisWeek.toLocaleString('vi-VN')}</b>Buổi học tuần này</span><span><b>{data.stats.activeCoaches.toLocaleString('vi-VN')}</b>Coach đang hoạt động</span><span><b>{data.stats.activeSports.toLocaleString('vi-VN')}</b>Bộ môn đang mở</span></div>
      </section>

      <section className="section section--white section--overflow" id="facilities">
        <div className="section-heading"><div><h2>Không Gian Thể Thao Sportigo</h2></div></div>
        {data.facilities.length ? <div className="facility-marquee"><div className="facility-track">{[...data.facilities, ...data.facilities].map((item, index) => <article className="facility-card" key={`${item.id}-${index}`}><img src={item.imageUrl} alt={index < data.facilities.length ? item.name : ''} loading="lazy" /><div><span>SPORTIGO</span><h3>{item.name}</h3><p>{item.description}</p></div></article>)}</div></div> : <p className="landing-empty">Thông tin không gian đang được cập nhật.</p>}
      </section>

      <section className="section" id="schedule">
        <div className="schedule-heading"><div><h2>Lớp nhóm & Khóa 1–1 nổi bật</h2></div><Link to="/member/classes">Xem toàn bộ lịch <ArrowRight /></Link></div>
        {featured.length ? <div className="schedule-showcase">
          <article className="schedule-featured"><img src={featured[0].image ?? data.heroSlides[0]?.imageUrl} alt={featured[0].sport} loading="lazy" /><div className="schedule-featured__shade" /><div className="schedule-featured__content"><div><span>{featured[0].type} · {featured[0].sport}</span><time>{featured[0].time}</time></div><h3>{featured[0].name}</h3><p>{featured[0].coach} · <MapPin /> {featured[0].room}</p><div><span><UsersThree /> {featured[0].capacity}</span><Link to={featured[0].href}>Xem chi tiết <ArrowRight /></Link></div></div></article>
          <div className="schedule-compact">{featured.slice(1).map((item) => <article key={item.id}><img src={item.image ?? data.heroSlides[0]?.imageUrl} alt={item.sport} loading="lazy" /><div><span>{item.type} · {item.sport}</span><h3>{item.name}</h3><p>{item.coach}</p><small><time>{item.time}</time> · {item.room} · {item.capacity}</small></div><Link to={item.href} aria-label={`Xem ${item.name}`}><ArrowRight /></Link></article>)}</div>
        </div> : <p className="landing-empty">Chưa có lớp nhóm hoặc khóa 1–1 đang mở.</p>}
      </section>

      <section className="section section--white" id="memberships">
        <div className="section-heading section-heading--center"><div><h2>Chọn hình thức tập luyện phù hợp</h2><span>Lớp nhóm theo lịch chung hoặc khóa cá nhân đồng hành riêng cùng Coach</span></div></div>
        <div className="active-service-group">
          <div className="active-service-group__header"><div><h3>Lớp nhóm đang mở</h3><p>Luyện tập theo lịch lớp, số lượng học viên và chỉ tiêu đăng ký.</p></div><Link to="/member/classes">Xem toàn bộ lớp <ArrowRight /></Link></div>
          {activeServices.groupClasses.length ? <div className="active-service-grid">{activeServices.groupClasses.map((service) => <article className="active-service-card" key={service.id}>
            <Link className="active-service-card__image" to={service.href} aria-label={`Xem ${service.name}`}><img src={service.image ?? data.heroSlides[0]?.imageUrl} alt={`Lớp nhóm ${service.sport}`} loading="lazy" /><span>Lớp nhóm</span></Link>
            <div className="active-service-card__body"><div><span>{service.sport}</span><strong>{service.price}</strong></div><h3>{service.name}</h3><p>Coach {service.coach}</p><small>{service.detail}</small><Link to={service.href}>Xem chi tiết <ArrowRight /></Link></div>
          </article>)}</div> : <p className="landing-empty">Chưa có lớp nhóm đang mở.</p>}
        </div>
        <div className="active-service-group active-service-group--private">
          <div className="active-service-group__header"><div><h3>Khóa cá nhân 1–1</h3><p>Học nhiều buổi với Coach riêng và lịch tuần cố định.</p></div><Link to="/member/private-courses">Xem toàn bộ khóa <ArrowRight /></Link></div>
          {activeServices.privateCourses.length ? <div className="active-service-grid">{activeServices.privateCourses.map((service) => <article className="active-service-card" key={service.id}>
            <Link className="active-service-card__image" to={service.href} aria-label={`Xem ${service.name}`}><img src={service.image ?? data.heroSlides[0]?.imageUrl} alt={`Khóa cá nhân ${service.sport}`} loading="lazy" /><span>Khóa cá nhân 1–1</span></Link>
            <div className="active-service-card__body"><div><span>{service.sport}</span><strong>{service.price}</strong></div><h3>{service.name}</h3><p>Coach {service.coach}</p><small>{service.detail}</small><Link to={service.href}>Xem chi tiết <ArrowRight /></Link></div>
          </article>)}</div> : <p className="landing-empty">Chưa có khóa cá nhân đang hoạt động.</p>}
        </div>
      </section>

      <section className="section coaches" id="coaches">
        <div className="section-heading"><div><p>ĐỘI NGŨ CHUYÊN GIA</p><h2>Coach đang hoạt động tại Sportigo</h2></div></div>
        {visibleCoaches.length ? <><div className="coach-carousel-shell">
          {coachGroups > 1 && <button className="coach-carousel-arrow coach-carousel-arrow--previous" type="button" aria-label="Xem 3 Coach trước" onClick={() => setCoachGroup((coachGroup - 1 + coachGroups) % coachGroups)}><CaretLeft /></button>}
          <div className="coach-carousel" aria-live="polite" aria-atomic="true">{visibleCoaches.map((coach, index) => <article className={`coach-card ${index === 1 ? 'coach-card--featured' : ''}`} key={coach.userId}>{coach.user.avatarUrl ? <img src={coach.user.avatarUrl} alt={`${coach.user.displayName}, Coach Sportigo`} loading="lazy" /> : <div className="coach-card__initials" aria-hidden="true">{initials(coach.user.displayName)}</div>}<div><span>{coach.coachSports.map((item) => item.sport.name).join(' · ') || 'Đang cập nhật chuyên môn'}</span><h3>{coach.user.displayName}</h3><p>{coach.bio || 'Hồ sơ chuyên môn đang được cập nhật.'}</p></div></article>)}</div>
          {coachGroups > 1 && <button className="coach-carousel-arrow coach-carousel-arrow--next" type="button" aria-label="Xem 3 Coach tiếp theo" onClick={() => setCoachGroup((coachGroup + 1) % coachGroups)}><CaretRight /></button>}
        </div>{coachGroups > 1 && <div className="coach-controls" role="group" aria-label="Chọn nhóm Coach">{Array.from({ length: coachGroups }, (_, group) => <button type="button" aria-label={`Xem nhóm Coach ${group + 1}`} aria-pressed={group === coachGroup} className={group === coachGroup ? 'active' : ''} onClick={() => setCoachGroup(group)} key={group} />)}</div>}</> : <p className="landing-empty">Chưa có Coach hoạt động để hiển thị.</p>}
      </section>

      <section className="partner-marquee" aria-label="Các thương hiệu thể thao nổi bật"><p>Thương hiệu đồng hành cùng Sportigo</p>{data.partners.length ? <div className="partner-marquee__viewport"><div className="partner-marquee__track">{[...data.partners, ...data.partners].map((partner, index) => <div className="partner-logo" role={index < data.partners.length ? 'img' : undefined} aria-label={index < data.partners.length ? `Logo ${partner.name}` : undefined} aria-hidden={index >= data.partners.length} key={`${partner.id}-${index}`}><img src={partner.logoUrl} alt="" loading="lazy" /></div>)}</div></div> : <p className="landing-empty">Danh sách đối tác đang được cập nhật.</p>}</section>

      <footer className="landing-footer">
        <div className="footer-brand"><BrandLogo className="footer-logo" /><p>{settings?.brandDescription}</p><div className="footer-social"><a href="#instagram" aria-label="Instagram"><InstagramLogo /></a><a href="#facebook" aria-label="Facebook"><FacebookLogo /></a><a href="#youtube" aria-label="YouTube"><YoutubeLogo /></a></div></div>
        <div className="footer-column"><h3>Khám phá</h3><a href="#facilities">Không gian</a><a href="#schedule">Lịch tập</a><a href="#memberships">Lớp & khóa 1–1</a><a href="#coaches">Huấn luyện viên</a></div>
        <div className="footer-column"><h3>Liên hệ</h3><a href={`tel:${settings?.hotline.replace(/\s/g, '') ?? ''}`}><Phone />{settings?.hotline}</a><span><Clock />{settings?.openingHours}</span><span><MapPin />{settings?.location}</span></div>
        <form className="footer-newsletter" onSubmit={submitNewsletter}><h3>Nhận tin từ Sportigo</h3><p>Nhận cập nhật lớp học mới từ hệ thống.</p><label><span className="sr-only">Địa chỉ email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email của bạn" aria-label="Địa chỉ email" /><button type="submit" disabled={newsletter.isPending} aria-label="Đăng ký nhận tin"><EnvelopeSimple /></button></label>{newsletter.isSuccess && <small>{newsletter.data.alreadySubscribed ? 'Email này đã đăng ký nhận tin.' : 'Đăng ký nhận tin thành công.'}</small>}{newsletter.isError && <small>Chưa thể đăng ký. Vui lòng thử lại.</small>}</form>
        <div className="footer-bottom"><small>© 2026 Sportigo Athletic Facility.</small><div><a href="#privacy">Chính sách bảo mật</a><a href="#terms">Điều khoản sử dụng</a></div></div>
      </footer>
    </main>
  )
}
