# SPEC 01 — MVP visual de Arcade Vault

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-08-03
> **Objective:** Reimplementar como app real de Next.js (App Router) las 6 pantallas del prototipo de `references/templates/` (biblioteca, detalle, jugador, salón de la fama, auth, nav) con toda su estética e interacciones visuales, sin lógica de juego real.

## Por qué este spec existe

El prototipo en `references/templates/` es un SPA de script global (React 18 + Babel standalone, sin build) con ruteo por hash y persistencia en `localStorage`. Este spec formaliza su reimplementación como una app Next.js idiomática (rutas reales de App Router, Tailwind v4, TypeScript), manteniendo el mismo modelo de datos mock y comportamiento visual, para tener una base navegable sobre la cual más adelante se pueda montar un juego real y un backend.

## Scope

**In:**

- Layout raíz con fondo decorativo animado (grid + scanlines + ruido), fuentes pixel/mono vía `next/font/google`, y navegación persistente (`Nav`) con menú móvil.
- Ruta `/` que redirige a `/biblioteca`.
- `/biblioteca`: grid de juegos con buscador por título, filtro por categoría (chips), tarjeta con efecto tilt al mouse, estado vacío "NO HAY RESULTADOS".
- `/juego/[id]`: detalle del juego (cover, tags, descripción, stats, botón jugar), leaderboard lateral de 10 filas (mock determinista), 404 real si el `id` no existe.
- `/juego/[id]/jugar`: HUD (puntuación, vidas, nivel), arena CRT decorativa, ticker de puntuación simulado (incrementos aleatorios cada ~220ms), subida de nivel cada 2500 pts, pausa/reanudar, botón fin, modal de fin de partida con guardado de puntuación (`localStorage.av_scores`) y reinicio de partida. 404 real si el `id` no existe.
- `/salon`: tabs por juego, podio (oro/plata/bronce), tabla completa de 12 filas (mock determinista), fila condicional "tu mejor marca" cuando hay sesión iniciada.
- `/auth`: tabs de inicio de sesión / crear cuenta, formulario simulado (cualquier envío es válido, no hay validación real de contraseña/correo), botón "jugar como invitado", ambos flujos escriben `localStorage.av_user` y redirigen a `/biblioteca`. Botones sociales (Google/GitHub) decorativos, sin acción.
- Modelo de datos mock portado a TypeScript: `GAMES` (8 juegos), `CATS`, `PLAYERS`, `seededScores()`.
- Responsive fiel a los breakpoints del prototipo (840px nav→hamburguesa, 900px detalle a 1 columna, 720px podio/tabla/paddings).
- Página 404 con estilo arcade para rutas de juego inválidas.

**Out of scope (para futuros specs):**

- Cualquier lógica de juego real/jugable (inputs, colisiones, motor de juego) — el arena y el ticker de puntuación son puramente decorativos.
- Backend/API real, base de datos, autenticación real (validación de contraseña, sesiones seguras, OAuth real de Google/GitHub).
- Leaderboards reales alimentados por partidas jugadas — el Salón de la Fama y el leaderboard de detalle siguen usando datos mock deterministas.
- Pantalla de perfil/cuenta de usuario.
- Sincronización entre pestañas/dispositivos de `av_user` o `av_scores`.
- Internacionalización (la copy queda en español, igual que el prototipo).

## Data model

Se porta el modelo de `references/templates/data.jsx` a TypeScript en `lib/data.ts`:

```ts
export interface Game {
  id: string;          // slug, ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;        // clase CSS de arte de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;        // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;         // "DD/MM/2026"
}

export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[]; // pool de 18 gamertags mock
export const GAMES: Game[]; // 8 juegos portados 1:1 desde data.jsx
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Persistencia en cliente (sin cambios de forma respecto al prototipo):

```ts
// localStorage.av_user
type StoredUser = { name: string } | null;

// localStorage.av_scores (array, se agrega, nunca se lee de vuelta)
type ScoreEntry = { game: string; score: number; name: string; at: number };
```

Las etiquetas fijas de `/juego/[id]` ("1 JUGADOR", "TECLADO / TÁCTIL", "RETRO 1985", dificultad ★★★☆☆) quedan como texto estático en el componente, no como campos de `Game`.

## Implementation plan

1. **Base visual y fuentes.** Extender `app/globals.css` con el bloque `@theme` de tokens neón (colores cyan/magenta/yellow/green, fondos, tinta) y las clases custom portadas de `styles.css` (fondo animado, glow, botones, notches). Cargar `Press Start 2P` y `JetBrains Mono` vía `next/font/google` en `app/layout.tsx`. Verificación: `npm run dev` sigue sirviendo la app sin errores, aunque el contenido siga siendo boilerplate.
2. **Modelo de datos.** Crear `lib/data.ts` con los tipos, `GAMES`, `CATS`, `PLAYERS` y `seededScores()` portados de `data.jsx`. Verificación: `tsc`/lint sin errores al importar desde una página de prueba.
3. **Layout raíz y navegación.** Crear `components/Nav.tsx` (desktop + drawer móvil) y un helper de sesión cliente (`lib/session.ts`, lee/escribe `av_user`), integrarlos en `app/layout.tsx` junto con las capas de fondo decorativo. `app/page.tsx` redirige a `/biblioteca`. Verificación: cualquier ruta muestra nav + fondo; `/` redirige.
4. **Biblioteca.** `app/biblioteca/page.tsx` + `components/GameCard.tsx` (grid, buscador, chips de categoría, tilt al mouse, estado vacío). Verificación: `/biblioteca` lista los 8 juegos y los filtros funcionan.
5. **Detalle.** `app/juego/[id]/page.tsx`: cover, tags, descripción, stat-strip, leaderboard lateral (`seededScores`), `notFound()` si el id no existe. Verificación: `/juego/bloque-buster` funciona; `/juego/no-existe` da 404.
6. **Jugador.** `app/juego/[id]/jugar/page.tsx` (client component): HUD, arena CRT decorativa, ticker de puntuación, subida de nivel, pausa, modal de fin de partida con guardado (`lib/scores.ts` → escribe `av_scores`) y reinicio. `notFound()` si el id no existe. Verificación: la puntuación sube sola, pausa la detiene, fin de partida abre el modal y guardar puntuación persiste en `localStorage`.
7. **Salón de la fama.** `app/salon/page.tsx`: tabs por juego, podio, tabla de 12 filas, fila "tu mejor marca" condicional a sesión. Verificación: cambiar de tab actualiza podio/tabla; la fila "tu marca" solo aparece con sesión iniciada.
8. **Auth.** `app/auth/page.tsx`: tabs login/signup, formulario simulado, botón invitado; ambos escriben `av_user` vía `lib/session.ts` y redirigen a `/biblioteca`. Verificación: cualquier envío inicia sesión y el nav refleja el nombre; "jugar como invitado" entra sin sesión.
9. **Responsive, 404 y pulido de casos borde.** Ajustar breakpoints (840/900/720px), crear `app/not-found.tsx` con estilo arcade, ocultar el link móvil "Cuenta" cuando ya hay sesión iniciada. Verificación: se prueba cada breakpoint y la página 404 con estilo.

## Acceptance criteria

- [ ] `/` redirige a `/biblioteca`.
- [ ] `/biblioteca` muestra los 8 juegos; el buscador filtra por título y el chip de categoría filtra por `cat`.
- [ ] `/biblioteca` muestra "NO HAY RESULTADOS" cuando el filtro no devuelve juegos.
- [ ] Click en una tarjeta o en "JUGAR" navega a `/juego/[id]`.
- [ ] `/juego/id-inexistente` devuelve la página 404.
- [ ] `/juego/[id]` muestra descripción, stat-strip y 10 filas de leaderboard.
- [ ] "JUGAR AHORA" navega a `/juego/[id]/jugar`; "VOLVER AL VAULT" navega a `/biblioteca`.
- [ ] `/juego/[id]/jugar` sube la puntuación automáticamente y el nivel sube cada 2500 puntos.
- [ ] El botón de pausa detiene el ticker y muestra el overlay "EN PAUSA".
- [ ] El botón "FIN" abre el modal de fin de partida con la puntuación final.
- [ ] Guardar la puntuación en el modal escribe una entrada en `localStorage.av_scores` y muestra el toast de guardado.
- [ ] "JUGAR DE NUEVO" reinicia el estado de la partida sin cambiar de ruta.
- [ ] `/salon` cambia de leaderboard al cambiar de tab (juego).
- [ ] `/salon` muestra la fila "tu mejor marca" solo cuando hay sesión iniciada.
- [ ] `/auth` permite iniciar sesión o crear cuenta con cualquier dato y redirige a `/biblioteca`.
- [ ] "JUGAR COMO INVITADO" entra sin sesión y redirige a `/biblioteca`.
- [ ] El nav muestra "Iniciar sesión" sin sesión y "{nombre} ▾" con sesión; cerrar sesión limpia `av_user`.
- [ ] El nav móvil oculta el link "Cuenta" cuando ya hay sesión iniciada.
- [ ] El nav colapsa a hamburguesa por debajo de 840px; el detalle pasa a 1 columna por debajo de 900px; el podio y la tabla de salón se adaptan por debajo de 720px.

## Decisions

- **Sí:** rutas reales de App Router (`/biblioteca`, `/juego/[id]`, `/juego/[id]/jugar`, `/salon`, `/auth`) en vez de ruteo por hash. Es idiomático en Next.js y arregla el bug del prototipo donde atrás/adelante del navegador no sincroniza con la ruta.
- **No:** ruteo por hash fiel al prototipo. Descartado por no ser idiomático y heredar un bug conocido.
- **Sí:** réplica completa del ticker de puntuación falso y el modal de fin de partida en `/juego/[id]/jugar`. Es animación decorativa, no lógica de juego, así que encaja con "solo visual".
- **Sí:** persistencia en `localStorage` (`av_user`, `av_scores`) igual que el prototipo; el Salón de la Fama sigue usando `seededScores()` mock, no las puntuaciones reales guardadas. No hay backend en este MVP, así que un leaderboard real no tendría datos reales que mostrar de todas formas.
- **Sí:** corregir los huecos obvios del prototipo (404 real para id inválido, ocultar "Cuenta" en mobile con sesión activa). Bajo costo, evita bugs literales sin ampliar el alcance.
- **No:** replicar esos huecos tal cual. Descartado — no aporta valor y es gratis de corregir.
- **Sí:** `next/font/google` para las fuentes pixel/mono. Ya es el patrón usado para Geist en el layout actual; evita una dependencia de red externa a Google Fonts en producción.
- **No:** mantener el `<link>` de Google Fonts del prototipo. Descartado a favor de auto-hospedar.
- **Sí:** portar `styles.css` como CSS global adaptado (extendiendo `@theme`) en vez de reescribir todos los efectos a utilidades Tailwind. Los efectos (CRT, notches, scanlines) son complejos de traducir 1:1 a utilidades sin perder fidelidad visual.
- **Sí:** `/` redirige a `/biblioteca` en vez de renderizar la biblioteca directamente en la raíz. Deja `/` libre para un futuro landing/marketing y mantiene una sola fuente de verdad para el contenido de biblioteca.
- **Sí:** mantener hardcoded las etiquetas y la dificultad de `/juego/[id]` (iguales para todos los juegos), sin agregar campos nuevos al modelo de datos. Fiel al prototipo; no se pidió enriquecer el modelo de datos.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Lectura de `localStorage` en componentes que Next.js podría intentar renderizar en servidor, causando mismatch de hidratación | Los componentes que leen/escriben `av_user`/`av_scores` son client components (`"use client"`) y leen `localStorage` dentro de `useEffect`, nunca durante el render inicial de servidor. |
| `localStorage` deshabilitado (modo privado/incógnito) | La app sigue siendo navegable; sesión y guardado de puntuación simplemente no persisten entre recargas, sin romper la UI. |
| El ticker de puntuación (`setInterval` cada 220ms) sigue corriendo si el usuario navega fuera de `/juego/[id]/jugar` sin limpiar el intervalo | El intervalo se limpia en el cleanup del `useEffect` del componente de la pantalla jugador. |

## What is **not** in this spec

- Lógica de juego real/jugable (motor, inputs, colisiones).
- Backend, base de datos, autenticación real.
- Leaderboards alimentados por partidas reales.
- Pantalla de perfil/cuenta de usuario.
- Internacionalización.

Cada uno de estos, si se necesita, va en su propio spec.
