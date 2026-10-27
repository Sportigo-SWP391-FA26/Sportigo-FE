import { useEffect, useState, type ReactNode } from 'react'
import { Barbell, Clock, Globe, Phone, SealCheck, UsersThree } from '@phosphor-icons/react'

type AuthShellProps = { children: ReactNode; variant: 'login' | 'register' }
const slides = [
  { label: 'Hồ bơi Olympic', image: '/images/landing/hero/swimming.webp' },
  { label: 'Gym & Thể lực', image: '/images/landing/hero/gym.webp' },
  { label: 'Cầu lông trong nhà', image: '/images/landing/hero/badminton.webp' },
]

export function AuthShell({ children, variant }: AuthShellProps) {
  const [activeSlide, setActiveSlide] = useState(variant === 'register' ? 1 : 0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 6000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <main className={`auth-page auth-page--${variant}`}>
      <section className="auth-visual" aria-label="Không gian tập luyện Sportigo">
        <div className="auth-visual__card">
          <div className="auth-slides" aria-hidden="true">{slides.map((slide, index) => <div className={`auth-slide ${index === activeSlide ? 'is-active' : ''}`} style={{ backgroundImage: `url(${slide.image})` }} key={slide.label} />)}</div>
          <div className="auth-visual__shade" />
          <div className="auth-visual__copy">
            <div className="auth-visual__statement">
              <h2>Không chỉ tập luyện.<br /><span>Sống trọn nhịp thể thao.</span></h2>
              <p>Một không gian dành cho chuyển động, phục hồi và những mục tiêu bền vững hơn mỗi ngày.</p>
            </div>
            <div className="auth-highlights" aria-label="Điểm nổi bật của Sportigo">
              <span><UsersThree /><strong>15.000+</strong><small>Hội viên</small></span>
              <span><Barbell /><strong>350+</strong><small>Lớp mỗi tuần</small></span>
              <span><SealCheck /><strong>100%</strong><small>Chuẩn quốc tế</small></span>
            </div>
            <div className="auth-slide-controls">{slides.map((slide, index) => <button type="button" className={index === activeSlide ? 'active' : ''} onClick={() => setActiveSlide(index)} key={slide.label}><span>0{index + 1} {slide.label}</span><i /></button>)}</div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <header className="auth-topbar"><span><Clock />Giờ mở cửa: <b>05:30 – 22:30</b>{variant === 'register' && ' (Mỗi ngày)'}</span><div><a href="tel:19006868"><Phone />Hotline: 1900 6868</a><i /><button type="button"><Globe />Tiếng Việt</button></div></header>
        <div className="auth-panel__inner">{children}</div>
        <footer className="auth-copyright"><span>© 2026 Sportigo Athletic Facility OS. All rights reserved.</span><div><a href="#terms">Điều khoản dịch vụ</a><i>•</i><a href="#privacy">Chính sách bảo mật</a></div></footer>
      </section>
    </main>
  )
}
