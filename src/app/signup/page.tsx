'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthShell, FormError } from '@/components/auth/AuthShell';

const CAMP_CODE = process.env.NEXT_PUBLIC_CAMP_CODE ?? 'MOA2026';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    campus: 'merida',
    workbookRoute: 'a2_b1',
    email: '',
    password: '',
    code: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.code.trim().toUpperCase() !== CAMP_CODE.toUpperCase()) {
      setError('The camp code is incorrect. Ask your moderator for the correct code.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          campus: form.campus,
          workbook_route: form.workbookRoute,
        },
      },
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
      title="Create my account"
      subtitle="Select your campus and the route assigned by your moderator."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-teal-600 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="name">My name</label>
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
          <label className="label">My campus</label>
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
          <label className="label">My route / workbook</label>
          <p className="mt-1 text-xs font-semibold text-ink/45">Choose the route assigned by your moderator.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { v: 'a2_b1', l: 'A2–B1', sub: 'Route 1' },
              { v: 'b2_c1', l: 'B2–C1', sub: 'Route 2' },
            ].map((r) => (
              <button
                key={r.v}
                type="button"
                onClick={() => set('workbookRoute', r.v)}
                aria-pressed={form.workbookRoute === r.v}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                  form.workbookRoute === r.v
                    ? 'border-plum-500 bg-plum-500 text-white shadow-moa'
                    : 'border-plum-100 bg-white text-plum-600 hover:border-plum-200'
                }`}
              >
                <span className="block text-sm font-extrabold">{r.l}</span>
                <span className={`block text-xs font-semibold ${form.workbookRoute === r.v ? 'text-white/70' : 'text-ink/40'}`}>{r.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
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
          <label className="label" htmlFor="pw">Password <span className="font-normal text-ink/45">(minimum 6 characters)</span></label>
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
          <label className="label" htmlFor="code">Camp code</label>
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
          {loading ? 'Creating…' : 'Start the camp'}
        </button>
      </form>
    </AuthShell>
  );
}
