import { List, X } from '@phosphor-icons/react';
import { useState, type MouseEvent } from 'react';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Sidebar } from '../components/navigation/Sidebar';
import { coachNavigation } from '../config/navigation';

export function CoachLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Đóng menu mobile sau khi chọn một mục
  const closeOnNavigate = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a')) setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <BrandLogo className="block h-11 w-36 [&_img]:h-full [&_img]:w-full [&_img]:object-contain" />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          aria-controls="coach-sidebar"
          className="grid size-11 place-items-center rounded-control bg-canvas text-2xl text-ink hover:bg-line focus-visible:outline-2 focus-visible:outline-primary"
        >
          {menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
        </button>
      </header>
      <div id="coach-sidebar" className={menuOpen ? 'block' : 'hidden lg:block'} onClick={closeOnNavigate}>
        <Sidebar roleLabel="Coach" items={coachNavigation} />
      </div>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
