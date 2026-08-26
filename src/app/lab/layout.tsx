import Link from 'next/link';
import { requireProfile } from '@/lib/supabase/session';
import { SignOutButton } from '@/components/SignOutButton';
import { CAMPUS_LABELS } from '@/lib/workbook';

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const isStaff = profile.role !== 'participant';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/85 backdrop-blur no-print">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/lab" className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-600">MOA Education</p>
            <p className="font-serif text-lg font-bold text-brand-900">Reading Lab 2026</p>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-brand-800">{profile.full_name}</p>
              <p className="text-xs text-ink/55">{profile.campus ? CAMPUS_LABELS[profile.campus] : 'Sin sede'}</p>
            </div>
            {isStaff && <Link href="/moderator" className="btn-ghost">Panel moderador</Link>}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      <footer className="pb-10 text-center text-xs text-ink/45 no-print">
        Read first. Think second. Ask AI third. · MOA Education | Immersive Summer Camp 2026
      </footer>
    </div>
  );
}
