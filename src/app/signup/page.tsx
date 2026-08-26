'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CAMP_CODE = process.env.NEXT_PUBLIC_CAMP_CODE ?? 'MOA2026';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', campus: 'merida', email: '', password: '', code: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.code.trim().toUpperCase() !== CAMP_CODE.toUpperCase()) {
      setError('El código del camp no es correcto. Pídeselo a tu moderador.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, campus: form.campus } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace('/lab');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="card p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-600">MOA Reading Lab</p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-brand-900">Mi registro</h1>
        <p className="mt-1 text-sm text-ink/60">Nombre y sede quedan en la portada de tu workbook digital.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Mi nombre</label>
            <input className="input mt-1" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
          </div>
          <div>
            <label className="label">Mi sede</label>
            <select className="input mt-1" value={form.campus} onChange={(e) => set('campus', e.target.value)}>
              <option value="merida">Mérida</option>
              <option value="el_vigia">El Vigía</option>
            </select>
          </div>
          <div>
            <label className="label">Correo</label>
            <input className="input mt-1" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Contraseña (mínimo 6 caracteres)</label>
            <input className="input mt-1" type="password" minLength={6} required value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div>
            <label className="label">Código del camp</label>
            <input className="input mt-1" required placeholder="MOA2026" value={form.code} onChange={(e) => set('code', e.target.value)} />
          </div>
          {error && <p className="rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-500">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creando…' : 'Empezar el camp'}</button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand-600">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
