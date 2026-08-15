# SPEC 04 — Integración base de Supabase

> **Estado:** Implemented · **Depende de:** Ninguno (spec de infraestructura transversal) · **Fecha:** 2026-08-15
> **Objetivo:** Integrar el SDK de Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
> en la app de Next.js — clientes de browser, servidor y proxy, credenciales del
> proyecto ya existente, y una página de prueba que confirma la conexión — sin
> implementar autenticación real ni crear tablas de datos todavía.

---

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Crear `lib/supabase/client.ts` — cliente de browser (`createBrowserClient`) para
  usarlo desde Client Components.
- Crear `lib/supabase/server.ts` — cliente de servidor (`createServerClient`) para
  Server Components y Route Handlers, leyendo/escribiendo cookies con `await cookies()`
  de `next/headers`.
- Crear `lib/supabase/middleware.ts` con una función `updateSession(request)` que
  refresca el token de sesión de Supabase en cada request (patrón estándar de
  `@supabase/ssr`).
- Crear `proxy.ts` en la raíz del proyecto que invoca `updateSession` en cada
  request. Usa la convención de esta versión de Next.js: archivo `proxy.ts` con
  `export function proxy(request)` — **no** `middleware.ts`/`export function
middleware`, que está deprecado desde Next 16 (ver `AGENTS.md`).
- Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como
  placeholders vacíos en `.env.local` y `.env.template`, mismo patrón que
  `RESEND_API_KEY` (spec 03).
- Crear página temporal `app/supabase-test/page.tsx` (`"use client"`) que llama a
  `supabase.auth.getSession()` con el cliente de browser y muestra "Conectado" o el
  mensaje de error — smoke test que no depende de ninguna tabla.

**Fuera de alcance:**

- Cualquier lógica real de autenticación (login/registro/logout con Supabase Auth).
  `UserContext.tsx`, `app/auth/page.tsx` y `components/Nav.tsx` no se tocan — siguen
  usando el mock de `localStorage` exactamente como hoy. Queda para un spec futuro.
- Cualquier tabla o esquema en la base de datos (perfiles, puntuaciones, etc.).
- Persistencia real de puntuaciones o del Salón de la Fama.
- Actividad en vivo en tiempo real (Supabase Realtime).
- Configuración de proveedores OAuth (Google/GitHub) — los botones placeholder en
  `/auth` no se tocan.
- Autorizar el MCP de Supabase (`.mcp.json`) — requiere login/OAuth manual del
  usuario, no se hace en este spec.

---

## Data model

No se introduce ningún modelo de datos ni tabla en la base de datos. Este spec solo
añade configuración (variables de entorno) y utilidades de cliente; no hay esquema
que documentar todavía.

---

## Implementation plan

1. **Instalar dependencias** — `npm install @supabase/supabase-js @supabase/ssr`.
   Verificación: ambos paquetes aparecen en `package.json` → `dependencies`.

2. **Añadir variables de entorno** — `NEXT_PUBLIC_SUPABASE_URL=` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` vacías en `.env.local` y `.env.template`.
   Verificación: ambas claves existen en los dos archivos.

3. **Crear `lib/supabase/client.ts`** — cliente de browser con `createBrowserClient`
   de `@supabase/ssr`, leyendo las env vars `NEXT_PUBLIC_*`.
   Verificación: el archivo exporta una función `createClient()` sin errores de tipos.

4. **Crear `lib/supabase/server.ts`** — cliente de servidor con `createServerClient`,
   usando `await cookies()` de `next/headers` para leer/escribir la sesión en Server
   Components y Route Handlers.
   Verificación: compila sin errores de tipos (`npm run build`).

5. **Crear `lib/supabase/middleware.ts` + `proxy.ts`** — `updateSession(request)`
   refresca el token de Supabase; `proxy.ts` en la raíz la invoca usando
   `export function proxy(request)` (convención de esta versión de Next.js).
   Verificación: `npm run dev` arranca sin errores y todas las rutas existentes
   siguen respondiendo con normalidad.

6. **Crear página temporal `app/supabase-test/page.tsx`** — llama a
   `supabase.auth.getSession()` con el cliente de browser y muestra "Conectado ✅"
   o el mensaje de error.
   Verificación: con las credenciales reales configuradas,
   `http://localhost:3000/supabase-test` muestra "Conectado" sin errores de consola.

7. **Verificación end-to-end** — completar las env vars con los valores reales del
   proyecto Supabase (Project Settings → API en el dashboard), reiniciar el server,
   confirmar `/supabase-test`, y recorrer `/`, `/games`, `/auth`, `/hall-of-fame`,
   `/about` para confirmar que ninguna ruta existente cambió de comportamiento.

---

## Acceptance criteria

- [x] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json` → `dependencies`.
- [x] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existen (vacías) en `.env.local` y `.env.template`. `.env.template` las mantiene vacías; `.env.local` ya tiene los valores reales del proyecto (Paso 7).
- [x] `lib/supabase/client.ts` exporta un cliente de browser funcional.
- [x] `lib/supabase/server.ts` exporta un cliente de servidor funcional usando `await cookies()`.
- [x] `proxy.ts` existe en la raíz del proyecto, invoca `updateSession` de `lib/supabase/middleware.ts`, y exporta la función como `proxy` (no `middleware`).
- [x] `npm run build` compila sin errores de tipos. TypeScript pasa limpio (`Finished TypeScript` sin errores); el comando `npm run build` completo falla por un problema preexistente y fuera de alcance en `/api/contact` (spec 03, falta `RESEND_API_KEY`) — confirmado que ya ocurre en `main` sin los cambios de este spec.
- [x] Con las credenciales reales configuradas, `http://localhost:3000/supabase-test` muestra "Conectado" sin errores de consola. Verificado sirviendo la página (200, sin errores en el log del servidor) y confirmando que la URL/key son válidas contra `/auth/v1/settings` de Supabase (200). No se pudo capturar el render post-JS con navegador headless (`chromium-cli`/Playwright no disponibles en este entorno).
- [x] Ninguna ruta existente (`/`, `/games`, `/auth`, `/hall-of-fame`, `/about`, `/api/contact`) cambia de comportamiento.
- [x] `UserContext.tsx`, `app/auth/page.tsx` y `components/Nav.tsx` no se modifican — el login/registro sigue siendo el mock de `localStorage`.

---

## Decisions

- **Sí:** `@supabase/ssr` con setup completo (browser + servidor + proxy), en lugar
  de solo `@supabase/supabase-js` en el cliente. Decisión explícita del usuario:
  deja la base lista para el spec de Auth real sin retrabajo, aunque este spec no
  use todavía el cliente de servidor ni el proxy para nada funcional.

- **Sí:** `proxy.ts` (no `middleware.ts`). En Next.js 16 el archivo `middleware` está
  deprecado y renombrado a `proxy` — confirmado en `node_modules/next/dist/docs/`
  por la advertencia de breaking changes de `AGENTS.md`.

- **Sí:** credenciales como placeholders vacíos en `.env.local`/`.env.template`,
  mismo patrón que `RESEND_API_KEY` (spec 03). El usuario las completa manualmente
  desde el dashboard de Supabase (Project Settings → API).

- **Sí:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en lugar de
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Decisión tomada durante la implementación (Paso 5):
  el dashboard de Supabase para este proyecto expone la clave pública como
  "Publishable key" (terminología actual de Supabase), no como "anon key". Se
  actualizó el spec y el código para usar el nombre real de la variable en lugar de
  renombrarla — evita confusión futura entre lo que dice el dashboard y lo que espera
  el código.

- **Sí:** página temporal `/supabase-test` como smoke test. No requiere ninguna
  tabla — solo confirma que las credenciales son válidas y el cliente puede hablar
  con el proyecto.

- **No:** no se toca `UserContext`, `/auth`, `Nav`, ni ninguna lógica de
  autenticación real. Decisión explícita del usuario — queda fuera de este spec.

- **No:** no se crea ninguna tabla ni esquema en la base de datos. El proyecto
  Supabase remoto no tiene tablas confirmadas todavía, y el diseño de
  perfiles/puntuaciones depende de decisiones que se tomarán en el spec de Auth futuro.

- **No:** no se configura OAuth social (Google/GitHub) — los botones placeholder en
  `/auth` no se tocan en este spec.

- **No:** no se autoriza el MCP de Supabase en este spec — requiere una acción
  manual del usuario (login/OAuth) fuera de lo que se puede ejecutar en este entorno.

---

## Identified risks

- El MCP de Supabase no está autorizado todavía; si más adelante se quiere que
  Claude ejecute migraciones SQL directamente vía MCP, el usuario deberá autorizarlo
  primero desde su cliente (fuera de este entorno no interactivo).
- Sin tablas ni RLS (Row Level Security) configuradas, el `anon key` queda expuesto
  en el bundle del cliente — es el comportamiento esperado y seguro de Supabase
  mientras no haya tablas con datos sensibles accesibles vía ese key.
