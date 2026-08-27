'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TableSub = {
  table: string;
  /** Filtro Postgres, ej. `user_id=eq.${id}` */
  filter?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
};

type Options = {
  channel: string;
  tables: TableSub[];
  /** ms de agrupacion: evita refrescos repetidos por una misma rafaga. */
  debounce?: number;
  onChange?: (payload: any) => void;
};

/**
 * Un solo canal Realtime por pantalla. La conexion se difiere hasta que el
 * navegador queda libre para no competir con hidratacion, inputs y primer
 * render del Lab.
 */
export function useRealtime({ channel, tables, debounce = 450, onChange }: Options) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const key = JSON.stringify(tables);

  useEffect(() => {
    const subs: TableSub[] = JSON.parse(key);
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;
    let idleId: number | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => startTransition(() => router.refresh());

    const schedule = (payload: any) => {
      cbRef.current?.(payload);
      if (document.visibilityState === 'hidden') {
        pending.current = true;
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, debounce);
    };

    const connect = () => {
      if (disposed || ch) return;
      let next = supabase.channel(channel, { config: { broadcast: { self: false } } });
      for (const s of subs) {
        next = next.on(
          'postgres_changes' as any,
          { event: s.event ?? '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
          schedule,
        );
      }
      ch = next;
      ch.subscribe();
    };

    // Realtime es importante, pero no necesita bloquear la interactividad del
    // primer segundo. requestIdleCallback tiene timeout para no dejarlo tarde.
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(connect, { timeout: 700 });
    } else {
      fallbackTimer = setTimeout(connect, 180);
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      connect();
      if (pending.current) {
        pending.current = false;
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      if (timer.current) clearTimeout(timer.current);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      document.removeEventListener('visibilitychange', onVisible);
      if (ch) void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, key, debounce, router]);
}
