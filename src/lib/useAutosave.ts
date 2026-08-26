'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SaveStatus } from '@/components/ui/SaveState';

type Args = {
  userId: string;
  day: number;
  sectionId: string;
  fieldKey: string;
  fieldLabel: string;
  initial: any;
  delay?: number;
};

/**
 * Autoguardado con debounce contra public.responses (upsert por user_id+field_key).
 *
 * Mejoras respecto a la version anterior:
 *  - Cliente Supabase compartido (antes se creaba uno por campo).
 *  - No escribe si el valor no cambio: menos trafico y menos eventos realtime.
 *  - Guarda al ocultar la pestana con `pagehide`/`visibilitychange`
 *    (`beforeunload` no dispara de forma fiable en moviles).
 *  - Si el dia esta cerrado, la RLS rechaza la escritura (codigo 42501) y se
 *    muestra "Dia cerrado" en vez de un error generico.
 */
export function useAutosave({ userId, day, sectionId, fieldKey, fieldLabel, initial, delay = 800 }: Args) {
  const [value, setValue] = useState<any>(initial ?? {});
  const [status, setStatus] = useState<SaveStatus>('idle');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearStatus = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(JSON.stringify(initial ?? {}));
  const latest = useRef(value);
  latest.current = value;

  const flush = useCallback(
    async (v: any) => {
      const serialized = JSON.stringify(v ?? {});
      if (serialized === lastSaved.current) return; // nada que hacer

      setStatus('saving');
      const { error } = await createClient()
        .from('responses')
        .upsert(
          { user_id: userId, day, section_id: sectionId, field_key: fieldKey, field_label: fieldLabel, value: v },
          { onConflict: 'user_id,field_key' },
        );

      if (error) {
        // 42501 = insufficient_privilege -> la politica RLS bloqueo el dia.
        setStatus(error.code === '42501' ? 'locked' : 'error');
        return;
      }

      lastSaved.current = serialized;
      setStatus('saved');
      if (clearStatus.current) clearTimeout(clearStatus.current);
      clearStatus.current = setTimeout(() => setStatus('idle'), 1800);
    },
    [userId, day, sectionId, fieldKey, fieldLabel],
  );

  // Debounce del guardado
  useEffect(() => {
    if (JSON.stringify(value ?? {}) === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(value), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, flush]);

  // Guardado inmediato al salir / cambiar de app
  useEffect(() => {
    const save = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void flush(latest.current);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };

    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
      if (clearStatus.current) clearTimeout(clearStatus.current);
    };
  }, [flush]);

  return { value, setValue, status };
}
