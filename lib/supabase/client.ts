import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para usarlo desde Client Components.
 * Usa las credenciales públicas (NEXT_PUBLIC_*), seguras de exponer en el bundle
 * mientras no haya tablas con datos sensibles accesibles vía el anon key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
