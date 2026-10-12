import { SignOut } from '@phosphor-icons/react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import type { NavigationItem } from '../../config/navigation';
import { logout } from '../../features/auth/api';

type SidebarProps = {
  roleLabel: string;
  items: NavigationItem[];
};

export function Sidebar({ roleLabel, items }: SidebarProps) {
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
      <p className="text-lg font-bold text-blue-600">Sport Center</p>
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
      <button
        className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
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
