import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Verifica la identidad usando el JWT ya presente en la sesion.
 *
 * `getClaims()` evita la llamada obligatoria al servidor de Auth que hace
 * `getUser()` en cada request. Con llaves JWT asimetricas Supabase verifica
 * localmente usando JWKS cacheado; con proyectos antiguos hace fallback a
 * verificacion remota sin perder seguridad.
 */
export async function getVerifiedUserId(client: SupabaseClient<Database>): Promise<string | null> {
  const { data, error } = await client.auth.getClaims();
  if (error) return null;
  const sub = data?.claims?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}
