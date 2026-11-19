import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/app/staff-payroll/performance', label: 'Hiệu suất nhân sự' },
  { to: '/app/staff-payroll/payroll', label: 'Bảng lương' },
];

export function StaffPayHubPage() {
  return (
    <div className="space-y-5">
      <nav aria-label="Hiệu suất và lương" className="mx-auto flex w-full max-w-7xl gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-center text-sm font-bold transition-colors ${isActive ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'}`}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
