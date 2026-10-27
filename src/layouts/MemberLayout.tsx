import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { MemberNavbar } from '../features/member/components/MemberNavbar';

export function MemberLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/member/home';

  return (
    <div className={`member-shell ${isHome ? 'member-shell--home' : ''}`}>
      <MemberNavbar />
      <main className="member-main"><Outlet /></main>
    </div>
  );
}
