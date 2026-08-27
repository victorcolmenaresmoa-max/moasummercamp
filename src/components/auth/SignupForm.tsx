'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FormError } from '@/components/auth/FormError';

export function SignupForm({ completingExistingSession = false }: { completingExistingSession?: boolean }) {
  const router = useRouter();

  const [form, setForm] = useState({
    campus: 'merida',
    workbookRoute: 'a2_b1',
    code: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; completed?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'We could not prepare your registration. Please try again.');
        setLoading(false);
        return;
      }

      // A user who arrived here after trying Google from /login already has a
      // valid session. The API completed the profile, so no second OAuth trip.
      if (payload.completed) {
        router.replace('/lab');
        router.refresh();
        return;
      }

      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('mode', 'signup');

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });

      if (error) {
        setError(
          error.message.toLowerCase().includes('provider')
            ? 'Google registration is not configured yet. Ask the administrator to enable Google in Supabase Auth.'
            : error.message,
        );
        setLoading(false);
      }
    } catch {
      setError('The connection failed before Google opened. Please check your internet connection and try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
              <span className={`block text-xs font-semibold ${form.workbookRoute === r.v ? 'text-white/70' : 'text-ink/40'}`}>
                {r.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="code">Camp code</label>
        <input
          id="code"
          className="input mt-1.5 font-bold uppercase tracking-widest"
          required
          autoComplete="off"
          placeholder="MOA2026"
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
        />
      </div>

      <FormError>{error}</FormError>

      <button className="btn-accent w-full py-3 text-base shadow-pop" disabled={loading}>
        <span
          aria-hidden="true"
          className="grid h-6 w-6 place-items-center rounded-full border border-plum-500/10 bg-white text-sm font-extrabold text-ink"
        >
          G
        </span>
        {loading
          ? completingExistingSession
            ? 'Finishing registration…'
            : 'Opening Google…'
          : completingExistingSession
            ? 'Finish registration'
            : 'Continue with Google'}
      </button>

      <p className="text-center text-xs font-semibold leading-relaxed text-ink/45">
        Your name and email come directly from your Google account. You do not need to create a password for this app.
      </p>
    </form>
  );
}
