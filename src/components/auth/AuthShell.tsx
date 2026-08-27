import Link from 'next/link';
import { MoaLogo, MoaPattern, Squiggle } from '@/components/brand/Moa';

/** Marco compartido por /login y /signup: mismo lienzo de marca, sin duplicar CSS. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca (solo escritorio) */}
      <aside className="relative hidden overflow-hidden bg-teal-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <MoaPattern />
        <div className="relative">
          <Link href="/">
            <MoaLogo tone="light" />
          </Link>
        </div>
        <div className="relative max-w-sm">
          <Squiggle className="h-8 w-28 text-sun-400" />
          <p className="h-display mt-5 text-3xl leading-tight">Reading Lab</p>
          <p className="mt-2 text-white/75">
            Immersive Summer Camp 2026 · Route 1 · Teachers A2/B1
          </p>
          <p className="mt-8 inline-block rounded-full bg-plum-500 px-5 py-2 text-sm font-bold">
            Read first. Think second. Ask AI third.
          </p>
        </div>
        <p className="relative text-xs text-white/50">MOA Education · Mérida &amp; El Vigía</p>
      </aside>

      {/* Formulario */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md animate-fade-up">
          <div className="lg:hidden">
            <Link href="/">
              <MoaLogo />
            </Link>
          </div>

          <h1 className="h-display mt-8 text-3xl text-teal-900 lg:mt-0">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink/60">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-center text-sm text-ink/60">{footer}</div>
        </div>
      </div>
    </main>
  );
}
