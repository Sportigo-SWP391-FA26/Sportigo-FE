import { List, X } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type MouseEvent } from 'react';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { getSessionRole } from '../components/auth/session';
import { Sidebar } from '../components/navigation/Sidebar';
import { centerManagerNavigation, receptionistNavigation } from '../config/navigation';
import { getRooms, getSports } from '../features/catalog/api';
import { catalogKeys } from '../features/catalog/hooks';
import { getGroupClasses } from '../features/group-classes/api';
import { groupClassKeys } from '../features/group-classes/hooks/useGroupClasses';
import { getPrivateCourses } from '../features/private-courses/api';
import { privateCourseKeys } from '../features/private-courses/hooks/usePrivateCourses';

export function AppLayout() {
  // note: /app dùng chung cho Manager và Receptionist, menu chọn theo role của phiên đăng nhập
  const isReceptionist = getSessionRole() === 'RECEPTIONIST';
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  // Làm ấm các màn hình thường dùng sau khi dashboard đã ổn định. Chạy tuần tự
  // để không chiếm hết connection pool Supabase và làm chậm request quan trọng.
  useEffect(() => {
    if (isReceptionist) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const prefetches = [
          () => queryClient.prefetchQuery({ queryKey: groupClassKeys.list(), queryFn: getGroupClasses, staleTime: 2 * 60_000 }),
          () => queryClient.prefetchQuery({ queryKey: privateCourseKeys.list(), queryFn: getPrivateCourses, staleTime: 2 * 60_000 }),
          () => queryClient.prefetchQuery({ queryKey: catalogKeys.sports, queryFn: getSports, staleTime: 5 * 60_000 }),
          () => queryClient.prefetchQuery({ queryKey: catalogKeys.rooms, queryFn: getRooms, staleTime: 5 * 60_000 }),
        ];

        for (const prefetch of prefetches) {
          if (cancelled) return;
          await prefetch();
        }
      })();
    }, 1_500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isReceptionist, queryClient]);

  const closeOnNavigate = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a')) setMenuOpen(false);
  };
  return (
    <div data-role-theme={isReceptionist ? 'receptionist' : 'manager'} className="min-h-screen bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <BrandLogo className="block h-11 w-36 [&_img]:h-full [&_img]:w-full [&_img]:object-contain" />
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="app-sidebar" className="grid size-11 place-items-center rounded-control bg-canvas text-2xl text-ink focus-visible:outline-2 focus-visible:outline-primary">
          {menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
        </button>
      </header>
      {menuOpen && <button type="button" className="fixed inset-0 z-40 bg-ink/35 lg:hidden" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div id="app-sidebar" className={`${menuOpen ? 'fixed inset-y-0 left-0 z-50 block w-[min(86vw,300px)] shadow-2xl' : 'hidden lg:block'} lg:static lg:w-auto lg:shadow-none lg:[&>aside]:h-full`} onClick={closeOnNavigate}>
        {menuOpen && <button type="button" onClick={() => setMenuOpen(false)} aria-label="Đóng menu" className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-control bg-canvas text-xl text-ink lg:hidden"><X aria-hidden="true" /></button>}
        <Sidebar
          roleLabel={isReceptionist ? 'Receptionist' : 'Center Manager'}
          roleVariant={isReceptionist ? 'receptionist' : 'manager'}
          items={isReceptionist ? receptionistNavigation : centerManagerNavigation}
          profilePath="/app/profile"
        />
      </div>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 lg:py-9">
        <div className="manager-content mx-auto w-full max-w-[1440px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
