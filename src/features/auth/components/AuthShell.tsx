import { useEffect, useState, type ReactNode } from 'react'
import { Clock, Globe, Phone } from '@phosphor-icons/react'
import { usePublicLanding } from '../../content/hooks'

type AuthShellProps = { children: ReactNode; variant: 'login' | 'register' }
export function AuthShell({ children, variant }: AuthShellProps) {
  const landing = usePublicLanding()
  const slides = (landing.data?.heroSlides ?? []).map((slide) => ({ label: slide.sport?.name ?? slide.title, image: slide.imageUrl }))
  const [activeSlide, setActiveSlide] = useState(variant === 'register' ? 1 : 0)
  useEffect(() => {
    if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 6000)
    return () => window.clearInterval(timer)
  }, [slides.length])
  const visibleSlide = slides.length ? activeSlide % slides.length : 0
  const settings = landing.data?.settings
  return (
    <main className={`auth-page auth-page--${variant}`}>
      <section className="auth-visual" aria-label="Không gian tập luyện Sportigo">
        <div className="auth-visual__card">
          <div className={`auth-slides ${slides.length ? '' : 'auth-slides--empty'}`} aria-hidden="true">{slides.map((slide, index) => <div className={`auth-slide ${index === visibleSlide ? 'is-active' : ''}`} style={{ backgroundImage: `url(${slide.image})` }} key={slide.label} />)}</div>
          <div className="auth-visual__shade" />
          <div className="auth-visual__copy">
            <div className="auth-visual__statement">
              <h2>{settings?.authPromotionTitle ?? 'Chào mừng đến Sportigo'}</h2>
              <p>{settings?.authPromotionDescription ?? 'Thông tin trung tâm đang được cập nhật.'}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <header className="auth-topbar"><span><Clock />Giờ mở cửa: <b>{settings?.openingHours ?? 'Đang cập nhật'}</b></span><div><a href={`tel:${settings?.hotline.replace(/\s/g, '') ?? ''}`}><Phone />Hotline: {settings?.hotline ?? 'Đang cập nhật'}</a><i /><button type="button"><Globe />Tiếng Việt</button></div></header>
        <div className="auth-panel__inner">{children}</div>
        <footer className="auth-copyright"><span>© 2026 Sportigo Athletic Facility OS. All rights reserved.</span><div><a href="#terms">Điều khoản dịch vụ</a><i>•</i><a href="#privacy">Chính sách bảo mật</a></div></footer>
      </section>
    </main>
  )
}
