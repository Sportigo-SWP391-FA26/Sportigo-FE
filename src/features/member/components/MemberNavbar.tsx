import { Bell, List, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrandLogo } from '../../../components/brand/BrandLogo';
import { memberProfile } from '../mockData';

const items = [
  ['Trang chủ', '/member/home'],
  ['Lịch lớp', '/member/classes'],
  ['Khóa 1–1', '/member/private-courses'],
  ['Lịch của tôi', '/member/my-schedule'],
  // Nhãn ngắn để navbar 7 mục không tràn ở màn 1170–1280px; tiêu đề trang dùng tên đầy đủ
  ['Kế hoạch', '/member/training-plan'],
  ['Tiến độ', '/member/progress'],
  ['Thanh toán', '/member/payments'],
] as const;

export function MemberNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const overlaysHero = pathname === '/member/home' && !scrolled;

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 36);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`member-nav ${overlaysHero ? 'member-nav--overlay' : ''}`}>
      <div className="member-nav__inner">
        <BrandLogo className="member-nav__logo" />
        <button className="member-nav__toggle" onClick={() => setOpen((value) => !value)} aria-label="Mở menu" aria-expanded={open}>
          {open ? <X /> : <List />}
        </button>
        <nav className={open ? 'member-nav__links is-open' : 'member-nav__links'} aria-label="Hội viên">
          {items.map(([label, path]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="member-nav__account">
          <button aria-label="Thông báo" className="member-nav__bell"><Bell /><i /></button>
          <img src={memberProfile.avatar} alt="" />
          <span>{memberProfile.name}</span>
        </div>
      </div>
    </header>
  );
}
