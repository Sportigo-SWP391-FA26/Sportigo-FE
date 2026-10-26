import { Outlet } from 'react-router-dom';
import { getSessionRole } from '../components/auth/session';
import { Sidebar } from '../components/navigation/Sidebar';
import { centerManagerNavigation, receptionistNavigation } from '../config/navigation';

export function AppLayout() {
  // note: /app dùng chung cho Manager và Receptionist, menu chọn theo role của phiên đăng nhập
  const isReceptionist = getSessionRole() === 'RECEPTIONIST';
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <Sidebar
        roleLabel={isReceptionist ? 'Receptionist' : 'Center Manager'}
        items={isReceptionist ? receptionistNavigation : centerManagerNavigation}
        profilePath="/app/profile"
      />
      <main className="p-6 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
