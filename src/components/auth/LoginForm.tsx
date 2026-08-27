'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FormError } from '@/components/auth/FormError';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('mode', 'login');
    if (nextPath?.startsWith('/')) callback.searchParams.set('next', nextPath);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });

    // Normally the browser leaves this page immediately. If Supabase rejects
    // the request (for example Google is not enabled), show a useful error.
    if (error) {
      setError(
        error.message.toLowerCase().includes('provider')
          ? 'Google sign-in is not configured yet. Ask the administrator to enable Google in Supabase Auth.'
          : error.message,
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        className="btn-ghost w-full border-teal-200 py-3 text-base shadow-sm"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        <span
          aria-hidden="true"
          className="grid h-6 w-6 place-items-center rounded-full border border-ink/10 bg-white text-sm font-extrabold text-ink"
        >
          G
        </span>
        {loading ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <FormError>{error}</FormError>

      <p className="text-center text-xs font-semibold leading-relaxed text-ink/45">
        No password to remember. Google verifies your account and MOA keeps your workbook session in Supabase.
      </p>
    </div>
  );
}
