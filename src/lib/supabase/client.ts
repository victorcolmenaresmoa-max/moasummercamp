'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * SINGLETON.
 *
 * Antes cada campo del workbook llamaba a createClient(): en el Dia 3 eso son
 * ~25 clientes de Supabase por pagina, cada uno con su propio socket, su timer
 * de refresco de token y su cola de reintentos. Ahora hay UNO por pestana.
 */
let browserClient: SupabaseClient<Database> | undefined;

export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: { params: { eventsPerSecond: 5 } },
        global: { headers: { 'x-application-name': 'moa-reading-lab' } },
      },
    );
  }
  return browserClient;
}

/** Alias mas explicito para codigo nuevo. */
export const supabase = createClient;
