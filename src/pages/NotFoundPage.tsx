import { ArrowLeft, ArrowRight, House, MapTrifold } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { ButtonLink } from '../components/ui/Button';
import { getSessionRole, roleHomePath } from '../components/auth/session';

export function NotFoundPage() {
  const navigate = useNavigate();
  const role = getSessionRole();
  const home = role ? roleHomePath[role] : '/';

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none absolute -right-32 -top-40 size-[30rem] rounded-full bg-accent-sky/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 size-[32rem] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <BrandLogo className="block w-36 sm:w-44 [&_img]:h-11 [&_img]:w-full [&_img]:object-contain [&_img]:object-left" />
          <span className="hidden text-xs font-bold uppercase tracking-[.18em] text-muted sm:block">Sportigo Athletic Club</span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <section className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-deep">
              <MapTrifold size={16} weight="bold" aria-hidden="true" /> Lạc đường rồi?
            </span>
            <h1 className="mt-6 text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.08] font-extrabold tracking-tight text-ink">
              Trang này không <span className="text-primary">có trong lịch.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
              Đường dẫn có thể đã thay đổi hoặc trang bạn tìm không còn tồn tại. Quay về Sportigo để tiếp tục hành trình tập luyện.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={home} variant="primary" icon={<House size={18} weight="bold" aria-hidden="true" />}>
                Về trang chủ <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </ButtonLink>
              <button type="button" onClick={() => navigate(-1)} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-5 text-sm font-bold text-ink transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
                <ArrowLeft size={18} weight="bold" aria-hidden="true" /> Quay lại
              </button>
            </div>
          </section>

          <div className="relative mx-auto flex aspect-square w-full max-w-[470px] items-center justify-center rounded-[2rem] border border-line bg-surface shadow-card" aria-hidden="true">
            <div className="absolute inset-6 rounded-[1.5rem] border border-dashed border-primary/20 sm:inset-9" />
            <div className="absolute inset-x-6 top-1/2 h-px bg-primary/15" />
            <div className="absolute inset-y-6 left-1/2 w-px bg-primary/15" />
            <div className="absolute left-10 top-12 size-3 rounded-full bg-accent-lime shadow-[0_0_0_8px_rgb(132_204_22_/_12%)]" />
            <div className="absolute bottom-14 right-12 size-3 rounded-full bg-accent-energy shadow-[0_0_0_8px_rgb(249_115_22_/_12%)]" />
            <div className="relative flex size-[68%] flex-col items-center justify-center rounded-full border border-primary/15 bg-primary/5">
              <span className="font-display text-[clamp(5rem,13vw,10rem)] leading-none font-black tracking-[-.12em] text-primary">404</span>
              <span className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">Chưa tìm thấy trang</span>
            </div>
          </div>
        </div>

        <footer className="border-t border-line pt-5 text-xs text-muted">© Sportigo · Luôn có một đường khác để tiếp tục.</footer>
      </div>
    </main>
  );
}
