'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthShell, FormError } from '@/components/auth/AuthShell';

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
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.fullName.trim(), campus: form.campus } },
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
    <AuthShell
      title="Mi registro"
      subtitle="Tu nombre y tu sede quedan en la portada de tu workbook digital."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-bold text-teal-600 underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="name">Mi nombre</label>
          <input
            id="name"
            className="input mt-1.5"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Mi sede</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              { v: 'merida', l: 'Mérida' },
              { v: 'el_vigia', l: 'El Vigía' },
            ].map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => set('campus', c.v)}
                aria-pressed={form.campus === c.v}
                className={`rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                  form.campus === c.v
                    ? 'border-teal-500 bg-teal-500 text-white shadow-moa'
                    : 'border-teal-100 bg-white text-teal-700 hover:border-teal-200'
                }`}
              >
                {c.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input
            id="email"
            className="input mt-1.5"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="pw">Contraseña <span className="font-normal text-ink/45">(mínimo 6 caracteres)</span></label>
          <input
            id="pw"
            className="input mt-1.5"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="code">Código del camp</label>
          <input
            id="code"
            className="input mt-1.5 font-bold uppercase tracking-widest"
            required
            placeholder="MOA2026"
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
          />
        </div>

        <FormError>{error}</FormError>

        <button className="btn-accent w-full py-3 text-base shadow-pop" disabled={loading}>
          {loading ? 'Creando…' : 'Empezar el camp'}
        </button>
      </form>
    </AuthShell>
  );
}
