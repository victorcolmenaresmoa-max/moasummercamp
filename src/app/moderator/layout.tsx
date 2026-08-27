import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/session';
import { SignOutButton } from '@/components/SignOutButton';
import { MoaLogo } from '@/components/brand/Moa';

export default async function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-teal-700 text-white shadow-moa no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/moderator" aria-label="Moderator panel" className="flex items-center gap-3">
            <MoaLogo tone="light" />
            <span className="hidden h-8 w-px bg-white/20 sm:block" />
            <span className="hidden text-sm font-extrabold text-sun-400 sm:block">
              Moderator panel
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold leading-tight">{profile.full_name}</p>
              <p className="eyebrow text-white/50">{profile.role}</p>
            </div>
            <Link href="/lab" className="btn-onDark btn-sm">
              View workbook
            </Link>
            <SignOutButton tone="light" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl grow px-5 py-8">{children}</main>
    </div>
  );
}
