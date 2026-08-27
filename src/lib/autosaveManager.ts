'use client';

import { createClient } from '@/lib/supabase/client';
import type { SaveStatus } from '@/components/ui/SaveState';
import type { Database } from '@/types/database';

type ResponseInsert = Database['public']['Tables']['responses']['Insert'];

type PendingSave = {
  record: ResponseInsert;
  serialized: string;
  onResult: (status: SaveStatus, serialized: string) => void;
};

const pending = new Map<string, PendingSave>();
let timer: ReturnType<typeof setTimeout> | null = null;
let activeFlush: Promise<void> | null = null;
let lifecycleListenersReady = false;

function attachLifecycleListeners() {
  if (lifecycleListenersReady || typeof window === 'undefined') return;
  lifecycleListenersReady = true;

  const flushBeforeBackground = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void flushAutosaves();
  };

  window.addEventListener('pagehide', flushBeforeBackground);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeforeBackground();
  });
}

/**
 * Mete/actualiza un campo en una cola compartida por toda la pagina.
 * Varias respuestas que cambien dentro de la misma ventana terminan en UN
 * upsert a Supabase, no en una peticion independiente por componente.
 */
export function queueAutosave(
  key: string,
  save: PendingSave,
  delay = 850,
) {
  attachLifecycleListeners();
  pending.set(key, save);

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushAutosaves();
  }, delay);
}

/** Fuerza el envio de todo lo pendiente. Reutiliza un flush ya en curso. */
export async function flushAutosaves(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (activeFlush) {
    await activeFlush;
    if (pending.size) await flushAutosaves();
    return;
  }

  if (!pending.size) return;

  const batch = Array.from(pending.values());
  pending.clear();
  batch.forEach((item) => item.onResult('saving', item.serialized));

  activeFlush = (async () => {
    const { error } = await createClient()
      .from('responses')
      .upsert(
        batch.map((item) => item.record),
        { onConflict: 'user_id,field_key' },
      );

    if (error) {
      const status: SaveStatus = error.code === '42501' ? 'locked' : 'error';
      batch.forEach((item) => item.onResult(status, item.serialized));
      return;
    }

    batch.forEach((item) => item.onResult('saved', item.serialized));
  })();

  try {
    await activeFlush;
  } finally {
    activeFlush = null;
  }

  // Si alguien escribio mientras la peticion anterior estaba en vuelo,
  // agrupamos esos cambios en el siguiente batch sin bloquear la escritura.
  if (pending.size && !timer) {
    timer = setTimeout(() => {
      timer = null;
      void flushAutosaves();
    }, 180);
  }
}
