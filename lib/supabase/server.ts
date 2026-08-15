import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para usarlo desde Server Components y Route Handlers.
 * Lee y escribe la sesión a través de las cookies de la request usando
 * `await cookies()` de `next/headers`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` fue llamado desde un Server Component.
            // Se puede ignorar si hay middleware/proxy refrescando la sesión.
          }
        },
      },
    },
  );
}
