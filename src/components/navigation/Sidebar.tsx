import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import type { NavigationItem } from '../../config/navigation';
import { logout } from '../../features/auth/api';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';

type SidebarProps = {
  roleLabel: string;
  items: NavigationItem[];
  /** Trang Hồ sơ theo layout: /coach/profile hoặc /app/profile */
  profilePath: string;
};

export function Sidebar({ roleLabel, items, profilePath }: SidebarProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <aside className="flex min-h-screen flex-col border-r border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold text-blue-600">Sport Center</p>
        {/* note(FR-54): Sidebar dùng cho Manager, Receptionist, Coach nên chuông luôn bật */}
        <NotificationBell
          align="left"
          buttonClassName="grid size-10 place-items-center rounded-full text-xl text-slate-600 hover:bg-slate-100"
        />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {roleLabel}
      </p>
      <nav className="mt-3 space-y-1" aria-label={roleLabel}>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm ${
                isActive
                  ? 'bg-blue-600 font-semibold text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {/* note: mt-auto đẩy cụm Hồ sơ + Đăng xuất xuống đáy sidebar */}
      <NavLink
        to={profilePath}
        className={({ isActive }) =>
          `mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`
        }
      >
        <UserCircle size={18} />
        Hồ sơ của tôi
      </NavLink>
      <button
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <SignOut size={18} />
        {isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
    </aside>
  );
}
