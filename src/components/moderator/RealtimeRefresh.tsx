'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Refresca el Server Component cuando cambia algo en la BD (tiempo real). */
export function RealtimeRefresh({ userId }: { userId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const filter = userId ? `user_id=eq.${userId}` : undefined;

    const channel = supabase
      .channel(`moa-live-${userId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses', filter }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkpoints', filter }, () => router.refresh())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [router, userId]);

  return null;
}
