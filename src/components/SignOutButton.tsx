'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={`${tone === 'light' ? 'btn-onDark' : 'btn-ghost'} btn-sm no-print`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.replace('/login');
      }}
    >
      {busy ? '…' : 'Sign out'}
    </button>
  );
}
