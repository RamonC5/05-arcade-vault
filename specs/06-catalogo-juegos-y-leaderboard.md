# SPEC 06 — Catálogo de juegos y leaderboard en Supabase

> **Estado:** Implemented · **Depende de:** SPEC 04 (Integración Supabase), SPEC 05
> (Juego Asteroides) · **Fecha:** 2026-08-15
> **Objetivo:** Migrar el catálogo de juegos a Supabase y reemplazar las
> puntuaciones simuladas por un leaderboard real y persistente para los 7
> juegos existentes.

---

## Scope

**In:**

- Tabla `games` en Supabase — migra el catálogo desde `app/data/games.ts`
  (id, title, short, long, cat, cover, color).
- Tabla `scores` en Supabase — persiste cada puntuación guardada (game_id,
  player_name, score, created_at).
- RLS: `SELECT` público en ambas tablas; `INSERT` en `scores` bloqueado para
  el rol `anon` (solo el servidor, vía service role, puede escribir).
- Nueva variable de entorno de servidor `SUPABASE_SERVICE_ROLE_KEY`
  (placeholder en `.env.template`).
- Nueva ruta `app/api/scores/route.ts` (POST) — valida `player_name` (1-24
  caracteres, `INVITADO` si viene vacío) y `score` (entero 0–999,999,999),
  inserta con el cliente de servidor y service role.
- SQL documentado en este spec (no migración versionada) con `CREATE
TABLE`, políticas RLS y `INSERT` de seed para los 7 juegos actuales.
- Conversión a Server Components + props (usando `lib/supabase/server.ts`)
  para leer `games` y `scores` en: `app/games/page.tsx`,
  `app/games/[id]/page.tsx`, `app/games/[id]/play/page.tsx`,
  `app/games/asteroides/play/page.tsx`, `app/hall-of-fame/page.tsx`, y la
  franja de juegos destacados de `app/page.tsx` (el rail que hoy usa
  `GAMES.slice(0,6)` — sigue mostrando juegos reales, aunque el resto del
  home siga fuera de alcance).
- Cableado real del botón "GUARDAR PUNTUACIÓN" (en el player mock genérico
  y en Asteroides) a la nueva ruta de API, sustituyendo el no-op actual.
- Sustitución de `seededScores()` por consultas reales en el sidebar de
  `app/games/[id]/page.tsx` y en `app/hall-of-fame/page.tsx` (top N, igual
  que hoy: 10 y 12 respectivamente).
- Estado vacío del leaderboard cuando un juego aún no tiene puntuaciones
  guardadas.
- `best` (mejor puntuación) y `plays` (jugadas) calculados en cada consulta
  (`MAX(score)` / `COUNT(*)` sobre `scores`), no almacenados en `games`.
- Eliminación de `app/data/games.ts` y `app/data/scores.ts` (y ajuste de
  `app/data/index.ts`).

**Fuera de alcance (para futuras specs):**

- Autenticación real de Supabase — se mantiene el nombre libre actual
  (`UserContext`/`localStorage`), sin login real.
- Motor de juego real para los otros 6 juegos — siguen generando su
  puntuación con el `setInterval` simulado; lo único nuevo es que esa
  puntuación final sí se persiste al guardar.
- Datos decorativos del home (`SCORES`, `TOP` en `app/page.tsx`) — quedan
  mock, tal como los definió spec 02.
- Migraciones versionadas con Supabase CLI (`supabase/migrations/`).
- Anti-cheat o rate limiting en el guardado de puntuaciones — solo
  validación básica de forma.
- Editar o borrar puntuaciones ya guardadas (solo alta y lectura).
- Paginación del leaderboard — se mantiene un top N fijo.
- Contador de "jugadas" que incremente por partida iniciada — `plays` se
  deriva solo de puntuaciones guardadas.
- Migrar imágenes/cover de juegos a Supabase Storage — `cover` sigue
  siendo una clase CSS.

---

## Data model

### Tabla `games`

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  created_at timestamptz not null default now()
);

alter table games enable row level security;

create policy "games_public_read" on games
  for select using (true);
-- Sin política de INSERT/UPDATE/DELETE: el catálogo se administra
-- manualmente desde el SQL Editor del dashboard, no desde la app.
```

### Tabla `scores`

```sql
create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  player_name text not null,
  score integer not null check (score >= 0 and score <= 999999999),
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);

alter table scores enable row level security;

create policy "scores_public_read" on scores
  for select using (true);
-- Sin política de INSERT: el rol anon no puede escribir directamente.
-- app/api/scores/route.ts usa la service role key, que ignora RLS.
```

### Seed (migración 1:1 desde `app/data/games.ts`, que se elimina)

```sql
insert into games (id, title, short, long, cat, cover, color) values
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.', '...', 'ARCADE', 'cover-bricks', 'cyan'),
  ('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.', '...', 'PUZZLE', 'cover-tetro', 'magenta'),
  ('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.', '...', 'ARCADE', 'cover-snake', 'green'),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.', '...', 'ARCADE', 'cover-glot', 'yellow'),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', '...', 'SHOOTER', 'cover-invaders', 'green'),
  ('rocas', 'ROCAS', 'Pulveriza asteroides en gravedad cero.', '...', 'SHOOTER', 'cover-rocas', 'yellow'),
  ('asteroides', 'ASTEROIDES', 'Dispara y sobrevive entre rocas espaciales a la deriva.', '...', 'SHOOTER', 'cover-asteroides', 'cyan');
-- Los '...' se completan con el texto "long" real de cada juego (ver app/data/games.ts actual).
-- No se migran "best"/"plays": empiezan en 0 de forma real, no simulada.
```

### Tipos TypeScript (`lib/types.ts`, nuevo archivo)

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
}

export interface GameWithStats extends Game {
  best: number; // MAX(score) sobre scores, 0 si no hay ninguna
  plays: number; // COUNT(*) sobre scores
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  date: string; // created_at formateado
}
```

### Contrato de `POST /api/scores`

```ts
// Request
{
  game_id: string;
  player_name: string;
  score: number;
}

// Response 200
{
  ok: true;
}

// Response 400 (validación fallida)
{
  error: string;
}
```

---

## Implementation plan

> Patrón repetido en los pasos 5-10: cada página hoy `"use client"` se
> divide en un Server Component (`page.tsx`, hace el fetch con
> `lib/supabase/server.ts`) y un Client Component vecino que recibe los
> datos por props y conserva la interactividad actual (filtros, HUD,
> `IntersectionObserver`, etc.).

1. **Infraestructura Supabase.** Ejecutar el SQL de este spec (tablas
   `games`/`scores`, RLS, seed) en el SQL Editor del dashboard de Supabase.
   Añadir `SUPABASE_SERVICE_ROLE_KEY` a `.env.local` y como placeholder
   (`XXXXX`) en `.env.template`.
2. **Cliente de servicio y tipos.** Crear `lib/supabase/service.ts`
   (cliente con la service role key, solo se importa desde código de
   servidor) y `lib/types.ts` (`Game`, `GameWithStats`, `LeaderboardEntry`).
3. **Helpers de consulta.** Crear `lib/queries.ts` con `getGames()`,
   `getGameById(id)`, `getLeaderboard(gameId, limit)`, usando
   `lib/supabase/server.ts`.
4. **Ruta de guardado.** Crear `app/api/scores/route.ts` (POST): valida
   `player_name` (1-24 car., `INVITADO` si vacío) y `score` (entero
   0-999.999.999), inserta con `lib/supabase/service.ts`, responde `{ ok:
true }` o `400 { error }`.
5. **Biblioteca (`/games`).** Dividir `app/games/page.tsx` en Server
   Component (`getGames()`) + `app/games/GamesGrid.tsx` (client,
   filtros/búsqueda actuales) recibiendo `games` por props.
6. **Detalle de juego (`/games/[id]`).** Convertir a Server Component con
   `getGameById` + `getLeaderboard(id, 10)`; sustituir `seededScores` por
   datos reales en el sidebar; añadir estado vacío ("Aún no hay partidas
   registradas").
7. **Player mock (`/games/[id]/play`).** Envolver en Server Component que
   obtiene el `game`; cablear "GUARDAR PUNTUACIÓN" a `POST /api/scores`
   (sustituye el no-op actual).
8. **Asteroides (`/games/asteroides/play`).** Mismo cableado de guardado
   real que el paso 7, reutilizando el `game` obtenido en servidor.
9. **Salón de la Fama (`/hall-of-fame`).** Convertir a Server Component:
   `getGames()` + `getLeaderboard(id, 12)` por pestaña; sustituir
   `seededScores`; añadir estado vacío por pestaña.
10. **Home (`/`).** Dividir en Server Component que obtiene `getGames()`
    para el rail de destacados + Client Component con el resto de la
    página igual que hoy (mock de `SCORES`/`TOP` incluido, fuera de
    alcance).
11. **Limpieza.** Eliminar `app/data/games.ts` y `app/data/scores.ts`;
    actualizar (o vaciar) `app/data/index.ts`.

---

## Acceptance criteria

- [x] Existe la tabla `games` en Supabase con las políticas RLS descritas y
      los 7 juegos migrados desde `app/data/games.ts`.
- [x] Existe la tabla `scores` en Supabase con las políticas RLS descritas
      (SELECT público, sin INSERT para `anon`).
- [x] `SUPABASE_SERVICE_ROLE_KEY` está documentada en `.env.template` y
      configurada en `.env.local`.
- [x] `POST /api/scores` guarda una puntuación válida y devuelve `{ ok:
true }`.
- [x] `POST /api/scores` rechaza con 400 un `score` negativo, no numérico,
      o mayor a 999.999.999.
- [x] `POST /api/scores` usa `INVITADO` cuando `player_name` viene vacío, y
      rechaza nombres de más de 24 caracteres.
- [x] `/games` muestra el catálogo leído desde Supabase (no desde
      `app/data/games.ts`, que ya no existe).
- [x] `/games/[id]` muestra el leaderboard real (top 10) del juego, con
      estado vacío si no hay puntuaciones.
- [x] `/hall-of-fame` muestra el leaderboard real (top 12) por cada juego,
      con estado vacío si no hay puntuaciones.
- [x] Guardar una puntuación en `/games/asteroides/play` la persiste en
      Supabase y aparece en `/games/asteroides` y `/hall-of-fame` tras
      recargar.
- [x] Guardar una puntuación en el player mock (`/games/[id]/play` de
      cualquier otro juego) la persiste igual que en Asteroides.
- [x] `best` y `plays` mostrados en tarjetas/detalle de cada juego reflejan
      `MAX(score)`/`COUNT(*)` reales de `scores`, no valores fijos.
- [x] Un `INSERT` directo en `scores` hecho con el cliente `anon` (sin
      pasar por `/api/scores`) es rechazado por RLS.
- [x] `app/data/games.ts` y `app/data/scores.ts` ya no existen en el repo y
      no quedan imports rotos.
- [x] `npm run build` compila sin errores.

---

## Decisions

- **Sí:** un solo spec combinando catálogo de juegos y leaderboard.
  **No:** separarlos en dos specs — comparten el diseño de esquema en
  Supabase y se pidieron juntos; separarlos hubiera duplicado esa parte.
- **Sí:** "tabla de juegos" = tabla real en Supabase que reemplaza
  `app/data/games.ts`.
  **No:** una vista tabular en la UI — no se pidió; el grid de tarjetas
  actual en `/games` se mantiene tal cual.
- **Sí:** leaderboard real para los 7 juegos desde ya.
  **No:** limitarlo solo a Asteroides — el usuario quiere el guardado
  operativo en todo el catálogo desde el principio, aunque 6 juegos sigan
  generando su puntuación con un `setInterval` simulado internamente.
- **Sí:** nombre libre, sin autenticación real (se mantiene
  `UserContext`/localStorage).
  **No:** exigir Supabase Auth real como prerrequisito — ampliaría
  demasiado el alcance. Queda como riesgo conocido: cualquiera puede
  guardar puntuaciones bajo cualquier nombre.
- **Sí:** lectura de datos vía Server Components + props, usando
  `lib/supabase/server.ts` (spec 04).
  **No:** fetch client-side con `lib/supabase/client.ts` — necesitaría
  spinners y expondría las queries al bundle del cliente.
- **Sí:** SQL manual documentado en este spec para crear las tablas.
  **No:** migraciones versionadas (`supabase/migrations/`) — no hay CLI
  configurada aún y el MCP de Supabase no está autorizado en este entorno;
  queda como posible spec futura.
- **Sí:** guardado de puntuación vía `app/api/scores/route.ts` (patrón ya
  usado en `/api/contact`, spec 03).
  **No:** insert directo desde el navegador con RLS pública de INSERT — se
  prefirió la capa de validación server-side.
- **Sí:** RLS bloquea INSERT anónimo en `scores`; solo el servidor
  (service role) escribe.
  **No:** permitir también INSERT anónimo como defensa en profundidad
  simple — debilitaría la garantía que da la ruta de API.
- **Sí:** `best`/`plays` calculados dinámicamente (`MAX`/`COUNT` sobre
  `scores`).
  **No:** columnas fijas actualizadas en cada guardado — añade complejidad
  de sincronización sin necesidad.
- **Sí:** el home (`/`) queda fuera de alcance.
  **No:** conectar sus datos decorativos a datos reales — spec 02 ya los
  definió como mock; no se amplía aquí.
- **Sí:** `app/data/games.ts` y `app/data/scores.ts` se eliminan.
  **No:** mantener `app/data/games.ts` como fallback ante fallos de
  Supabase — duplicaría la fuente de verdad; el manejo de errores de fetch
  queda a los mecanismos genéricos de Next.js.
- **Sí:** límites de validación por defecto (nombre 1-24 car., score
  0-999.999.999).
  **No:** límites personalizados — no se solicitaron.

---

## Risks

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin autenticación real, cualquiera puede hacer `POST /api/scores` con nombre/puntuación arbitraria (no hay forma de verificar que la partida ocurrió de verdad).    | Aceptado como límite conocido de este spec; solo se valida la forma (rango de score, longitud de nombre), no el contenido. Anti-cheat queda fuera de alcance. |
| Si `SUPABASE_SERVICE_ROLE_KEY` falta o es incorrecta en el entorno de despliegue, `/api/scores` falla en producción.                                                | Documentar la variable en `.env.template`; verificar su presencia como parte del checklist de deploy.                                                         |
| Si el SQL de creación/seed (paso 1) no se ejecuta antes de desplegar el código que ya no importa `app/data/games.ts`, todas las páginas muestran el catálogo vacío. | El paso 1 del plan de implementación debe ejecutarse y verificarse (tablas + seed visibles en el dashboard) antes de desplegar los pasos de código.           |
| `best`/`plays` se calculan con una agregación sobre `scores` en cada request, sin caché — con mucho tráfico podría degradar el rendimiento.                         | Aceptable a esta escala; si hace falta, cachear o desnormalizar en una spec futura.                                                                           |

---

## What is **not** in this spec

- Autenticación real de Supabase (login/registro, RLS por usuario).
- Motor de juego real para los 6 juegos que hoy son mock (bloque-buster,
  caída, serpentina, glotón, invasores, rocas).
- Datos decorativos del home (`SCORES`/`TOP` en `app/page.tsx`).
- Migraciones versionadas con Supabase CLI.
- Anti-cheat, rate limiting, edición/borrado de puntuaciones, paginación
  del leaderboard, contador real de "jugadas" por sesión, o Supabase
  Storage para imágenes de juegos.

Cada uno de estos, si se aborda, va en su propia spec futura.
