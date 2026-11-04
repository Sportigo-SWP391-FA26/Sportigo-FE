import { CaretDown, SignOut, UserCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import type { NavigationEntry, NavigationItem } from '../../config/navigation';
import { logout } from '../../features/auth/api';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { BrandLogo } from '../brand/BrandLogo';

type SidebarProps = {
  roleLabel: string;
  roleVariant: 'manager' | 'receptionist' | 'coach';
  items: NavigationEntry[];
  /** Trang Hồ sơ theo layout: /coach/profile hoặc /app/profile */
  profilePath: string;
};

const activeClasses = {
  manager: 'bg-primary-deep text-white shadow-sm',
  receptionist: 'bg-accent-energy text-white shadow-sm',
  coach: 'bg-accent-lime text-ink shadow-sm',
};

const roleLabels = {
  manager: 'Trung tâm điều hành',
  receptionist: 'Quầy lễ tân',
  coach: 'Không gian Coach',
};

export function Sidebar({ roleLabel, roleVariant, items, profilePath }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const groups = items.filter((entry): entry is Extract<NavigationEntry, { items: NavigationItem[] }> => 'items' in entry);
  const storageKey = `sportigo:sidebar:${roleVariant}`;
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const activeLabels = groups.filter((group) => group.items.some((item) => location.pathname.startsWith(item.path))).map((group) => group.label);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) return [...new Set([...(JSON.parse(saved) as string[]), ...activeLabels])];
    } catch {
      // Local storage có thể bị chặn; sidebar vẫn hoạt động theo route hiện tại.
    }
    return activeLabels;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(openGroups));
    } catch {
      // Không chặn điều hướng khi trình duyệt không cho phép lưu trạng thái.
    }
  }, [openGroups, storageKey]);

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  };

  const renderLink = (item: NavigationItem, nested = false) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        `block rounded-control px-3 py-2.5 text-sm font-semibold transition-colors ${nested ? 'ml-2 border-l border-line pl-4' : ''} ${
          isActive ? activeClasses[roleVariant] : 'text-muted hover:bg-canvas hover:text-ink'
        }`
      }
    >
      {item.label}
    </NavLink>
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <aside data-role-theme={roleVariant} className="flex min-h-screen flex-col border-r border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <BrandLogo className="block h-12 w-36 [&_img]:h-full [&_img]:w-full [&_img]:object-contain" />
        {/* note(FR-54): Sidebar dùng cho Manager, Receptionist, Coach nên chuông luôn bật */}
        <NotificationBell
          align="left"
          buttonClassName="grid size-10 place-items-center rounded-full text-xl text-muted hover:bg-canvas focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>
      <div className="mt-6 rounded-card bg-canvas px-3.5 py-3"><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-muted">{roleLabels[roleVariant]}</p><p className="mt-1 text-sm font-bold text-ink">{roleLabel}</p></div>
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1" aria-label={roleLabel}>
        {items.map((entry) => {
          if (!('items' in entry)) return renderLink(entry);
          const isOpen = openGroups.includes(entry.label);
          const containsActive = entry.items.some((item) => location.pathname.startsWith(item.path));
          return (
            <div key={entry.label} className="py-0.5">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-control px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-[.08em] transition-colors ${containsActive ? 'text-primary-deep' : 'text-muted hover:bg-canvas hover:text-ink'}`}
                aria-expanded={isOpen}
                onClick={() => toggleGroup(entry.label)}
              >
                <span>{entry.label}</span>
                <CaretDown size={15} weight="bold" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <div className="space-y-1 py-1">{entry.items.map((item) => renderLink(item, true))}</div>}
            </div>
          );
        })}
      </nav>
      {/* note: mt-auto đẩy cụm Hồ sơ + Đăng xuất xuống đáy sidebar */}
      <NavLink
        to={profilePath}
        className={({ isActive }) =>
          `mt-3 flex items-center gap-2 rounded-control px-3 py-2.5 text-sm font-semibold ${
            isActive ? activeClasses[roleVariant] : 'text-muted hover:bg-canvas hover:text-ink'
          }`
        }
      >
        <UserCircle size={18} />
        Hồ sơ của tôi
      </NavLink>
      <button
        className="flex items-center gap-2 rounded-control px-3 py-2.5 text-sm font-semibold text-muted hover:bg-danger/8 hover:text-danger disabled:opacity-60"
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
