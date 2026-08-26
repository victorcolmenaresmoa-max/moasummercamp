import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    redirect(profile?.role === 'participant' || !profile ? '/lab' : '/moderator');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent-600">MOA Education</p>
      <h1 className="mt-3 font-serif text-4xl font-bold text-brand-900 sm:text-5xl">
        Immersive Summer Camp 2026
      </h1>
      <p className="mt-2 text-lg font-semibold text-brand-600">Reading Lab · Route 1 · Teachers A2/B1</p>
      <p className="mt-6 max-w-xl text-ink/70">
        Cuatro laboratorios de lectura: Identity, Clarity, Decision y Growth. Tú eres el protagonista de
        la sesión; el moderador acompaña y firma tus checkpoints.
      </p>
      <p className="mt-6 rounded-full bg-brand-900 px-5 py-2 text-sm font-bold text-white">
        Read first. Think second. Ask AI third.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="btn-primary">Registrarme</Link>
        <Link href="/login" className="btn-ghost">Ya tengo cuenta</Link>
      </div>
    </main>
  );
}
