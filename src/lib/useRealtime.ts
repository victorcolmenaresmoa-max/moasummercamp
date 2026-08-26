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
  /** ms de agrupacion: 25 docentes escribiendo a la vez no deben dar 25 refrescos. */
  debounce?: number;
  onChange?: (payload: any) => void;
};

/**
 * Suscripcion realtime con:
 *  - un unico canal por pantalla (no uno por tabla),
 *  - debounce para agrupar rafagas de eventos,
 *  - startTransition para que el refresco no bloquee lo que el usuario escribe,
 *  - pausa cuando la pestana esta en segundo plano (ahorra bateria y ancho de banda),
 *  - resincronizacion al volver a la pestana (por si perdio eventos).
 */
export function useRealtime({ channel, tables, debounce = 400, onChange }: Options) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  // Serializamos la config para no re-suscribir en cada render.
  const key = JSON.stringify(tables);

  useEffect(() => {
    const subs: TableSub[] = JSON.parse(key);
    const supabase = createClient();

    const refresh = () => startTransition(() => router.refresh());

    const schedule = (payload: any) => {
      cbRef.current?.(payload);
      if (document.visibilityState === 'hidden') {
        pending.current = true; // se aplicara al volver
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, debounce);
    };

    let ch = supabase.channel(channel, { config: { broadcast: { self: false } } });
    for (const s of subs) {
      ch = ch.on(
        'postgres_changes' as any,
        { event: s.event ?? '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
        schedule,
      );
    }
    ch.subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.current) {
        pending.current = false;
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, key, debounce, router]);
}
