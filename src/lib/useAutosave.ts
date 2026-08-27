'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { queueAutosave } from '@/lib/autosaveManager';
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
 * Autosave ligero: cada campo conserva su estado local, pero todas las
 * escrituras comparten una sola cola/batch por pestana.
 */
export function useAutosave({ userId, day, sectionId, fieldKey, fieldLabel, initial, delay = 850 }: Args) {
  const [value, setValue] = useState<any>(initial ?? {});
  const [status, setStatus] = useState<SaveStatus>('idle');

  const lastSaved = useRef(JSON.stringify(initial ?? {}));
  const latest = useRef(value);
  const mounted = useRef(true);
  const clearStatus = useRef<ReturnType<typeof setTimeout> | null>(null);
  latest.current = value;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (clearStatus.current) clearTimeout(clearStatus.current);
    };
  }, []);

  const onResult = useCallback((nextStatus: SaveStatus, serialized: string) => {
    if (nextStatus === 'saved') lastSaved.current = serialized;
    if (!mounted.current) return;

    // Si el usuario ya escribio algo nuevo mientras se guardaba el valor
    // anterior, no mostramos un "Saved" enganoso para el valor nuevo.
    const latestSerialized = JSON.stringify(latest.current ?? {});
    if (nextStatus === 'saved' && latestSerialized !== serialized) return;

    setStatus(nextStatus);
    if (nextStatus === 'saved') {
      if (clearStatus.current) clearTimeout(clearStatus.current);
      clearStatus.current = setTimeout(() => {
        if (mounted.current) setStatus('idle');
      }, 1500);
    }
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(value ?? {});
    if (serialized === lastSaved.current) return;

    queueAutosave(
      `${userId}:${fieldKey}`,
      {
        serialized,
        record: {
          user_id: userId,
          day,
          section_id: sectionId,
          field_key: fieldKey,
          field_label: fieldLabel,
          value,
        },
        onResult,
      },
      delay,
    );
  }, [value, delay, userId, day, sectionId, fieldKey, fieldLabel, onResult]);

  return { value, setValue, status };
}
