import Link from 'next/link';
import { requireProfile } from '@/lib/supabase/session';
import { SignOutButton } from '@/components/SignOutButton';
import { MoaLogo } from '@/components/brand/Moa';
import { CAMPUS_LABELS } from '@/lib/workbook';

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const isStaff = profile.role !== 'participant';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-teal-900/5 bg-paper/95 no-print">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/lab" aria-label="Go to my workbook">
            <MoaLogo />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold leading-tight text-teal-800">{profile.full_name}</p>
              <p className="text-xs font-semibold text-ink/50">
                {profile.campus ? CAMPUS_LABELS[profile.campus] : 'No campus'}
              </p>
            </div>
            {isStaff && (
              <Link href="/moderator" className="btn-ghost btn-sm">
                Moderator panel
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl grow px-5 py-8">{children}</main>

      <footer className="pb-10 pt-4 text-center no-print">
        <p className="text-xs font-semibold text-ink/40">
          Read first. Think second. Ask AI third. · MOA Education | Immersive Summer Camp 2026
        </p>
      </footer>
    </div>
  );
}
