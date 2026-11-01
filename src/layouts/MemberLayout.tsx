import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { MemberNavbar } from '../features/member/components/MemberNavbar';

export function MemberLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/member/home';
  const isClassCatalog = pathname === '/member/classes';

  return (
    <div className={`member-shell ${isHome ? 'member-shell--home' : ''} ${isClassCatalog ? 'member-shell--classes' : ''}`}>
      <MemberNavbar />
      <main className="member-main"><Outlet /></main>
    </div>
  );
}
