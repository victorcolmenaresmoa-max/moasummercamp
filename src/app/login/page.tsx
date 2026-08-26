'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    const dest = params.get('next') ?? (profile?.role === 'participant' ? '/lab' : '/moderator');
    router.replace(dest);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-600">MOA Reading Lab</p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-brand-900">Entrar</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Correo</label>
            <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-500">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          ¿Primera vez? <Link href="/signup" className="font-semibold text-brand-600">Regístrate aquí</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
