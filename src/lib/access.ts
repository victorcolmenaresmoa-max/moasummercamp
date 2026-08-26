import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export type DayNumber = 1 | 2 | 3 | 4;
export const ALL_DAYS: DayNumber[] = [1, 2, 3, 4];

/**
 * Que dias tiene abiertos el usuario autenticado.
 * Fuente unica de verdad: la funcion SQL public.my_open_days(), la misma
 * logica que aplican las politicas RLS al escribir. Si el frontend fallara,
 * la base de datos seguiria rechazando la escritura.
 */
export async function getOpenDays(): Promise<Set<number>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('my_open_days');
  if (error || !data) {
    // Ante la duda, solo el Dia 1: nunca abrimos de mas por un fallo.
    console.error('[access] my_open_days', error?.message);
    return new Set([1]);
  }
  return new Set((data as number[]).map(Number));
}

/** El staff no tiene candados. */
export function isStaff(profile: Pick<Profile, 'role'>) {
  return profile.role === 'moderator' || profile.role === 'admin';
}
