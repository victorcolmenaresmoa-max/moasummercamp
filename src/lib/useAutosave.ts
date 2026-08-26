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
 * Autoguardado con debounce contra public.responses.
 * Upsert por (user_id, field_key): una fila por campo del workbook.
 */
export function useAutosave({ userId, day, sectionId, fieldKey, fieldLabel, initial, delay = 900 }: Args) {
  const [value, setValue] = useState<any>(initial ?? {});
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const supabase = useRef(createClient());

  const flush = useCallback(
    async (v: any) => {
      setStatus('saving');
      const { error } = await supabase.current
        .from('responses')
        .upsert(
          { user_id: userId, day, section_id: sectionId, field_key: fieldKey, field_label: fieldLabel, value: v },
          { onConflict: 'user_id,field_key' },
        );
      setStatus(error ? 'error' : 'saved');
      if (!error) setTimeout(() => setStatus('idle'), 1800);
    },
    [userId, day, sectionId, fieldKey, fieldLabel],
  );

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(value), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, flush]);

  // Guarda inmediatamente si el usuario cierra la pestana.
  useEffect(() => {
    const onHide = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void flush(value);
      }
    };
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, [value, flush]);

  return { value, setValue, status };
}
