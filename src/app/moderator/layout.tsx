import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/session';
import { SignOutButton } from '@/components/SignOutButton';

export default async function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-brand-900 text-white no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/moderator" className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">MOA Education</p>
            <p className="font-serif text-lg font-bold">Panel del moderador</p>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{profile.full_name}</p>
              <p className="text-xs text-white/60 uppercase">{profile.role}</p>
            </div>
            <Link href="/lab" className="btn-ghost">Ver workbook</Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
