import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { centerManagerNavigation } from '../config/navigation';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <Sidebar roleLabel="Center Manager" items={centerManagerNavigation} />
      <main className="p-6 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
