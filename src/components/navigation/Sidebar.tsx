import { NavLink } from 'react-router-dom';
import type { NavigationItem } from '../../config/navigation';

type SidebarProps = {
  roleLabel: string;
  items: NavigationItem[];
};

export function Sidebar({ roleLabel, items }: SidebarProps) {
  return (
    <aside className="border-r border-slate-200 bg-white p-5">
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
    </aside>
  );
}
