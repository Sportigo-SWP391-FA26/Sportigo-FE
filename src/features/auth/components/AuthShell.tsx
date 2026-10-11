import { useEffect, useState, type ReactNode } from 'react'
import { Barbell, Clock, Globe, Phone, SealCheck, UsersThree } from '@phosphor-icons/react'
import { BrandLogo } from '../../../components/brand/BrandLogo'

type AuthShellProps = { children: ReactNode; variant: 'login' | 'register' }
const slides = [
  { label: 'Hồ bơi Olympic', image: '/images/auth/pool.webp' },
  { label: 'Sân Tennis ITF', image: '/images/auth/tennis.webp' },
  { label: 'Gym & Thể lực', image: '/images/auth/gym.webp' },
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
          <BrandLogo className="auth-visual__logo" />
          <div className="auth-visual__copy">
            <h2>ĐỈNH CAO THỂ THAO &amp; PHỤC HỒI<br />CHUYÊN NGHIỆP</h2>
            <div className="auth-badges"><span><UsersThree />15.000+ Hội viên</span><span><Barbell />350+ Lớp tập/tuần</span><span><SealCheck />100% Chuẩn quốc tế</span></div>
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
