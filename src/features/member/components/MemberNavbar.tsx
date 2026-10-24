import { List, SignOut, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { BrandLogo } from '../../../components/brand/BrandLogo';
import { logout } from '../../auth/api';
import { NotificationBell } from '../../notifications/components/NotificationBell';
import { useMyProfile } from '../../profile/hooks/useMyProfile';

// Chữ cái đầu của 2 từ cuối, ví dụ "Nguyễn Trường Giang" → "TG"
function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((word) => word[0]?.toUpperCase() ?? '').join('');
}

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const overlaysHero = pathname === '/member/home' && !scrolled;
  // note: một số trang /member chưa yêu cầu đăng nhập; chỉ gọi /users/me khi có phiên Member để tránh 401 thừa
  const isMember = getSessionRole() === 'MEMBER';
  const profile = useMyProfile(isMember);
  const displayName = profile.data?.displayName ?? 'Hội viên';

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 36);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

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
          {/* note(FR-54): chuông thật thay cho nút tĩnh; chấm đỏ cũ đổi thành huy hiệu số chưa đọc */}
          <NotificationBell enabled={isMember} buttonClassName="member-nav__bell" align="right" />
          <Link to="/member/profile" className="member-nav__profile" aria-label={`Hồ sơ của ${displayName}`}>
            <strong className="member-nav__avatar" aria-hidden="true">{initials(displayName)}</strong>
            <span>{displayName}</span>
          </Link>
          <button className="member-nav__logout" type="button" onClick={handleLogout} disabled={isLoggingOut} aria-label="Đăng xuất">
            <SignOut />
            <span>{isLoggingOut ? 'Đang thoát…' : 'Đăng xuất'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
