import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la service role key.
 *
 * Solo se importa desde código de servidor (Route Handlers). Ignora RLS,
 * por lo que puede escribir en tablas donde el rol `anon` no tiene permiso
 * de INSERT (p. ej. `scores`). Nunca debe importarse desde un Client
 * Component ni exponerse al bundle del navegador.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
