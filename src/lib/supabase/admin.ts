import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Cliente con service_role. SOLO en el servidor (route handlers).
 * Ignora RLS: usalo unicamente despues de haber verificado la identidad
 * y el rol del usuario que hace la peticion.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
