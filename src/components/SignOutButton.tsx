'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-ghost no-print"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
