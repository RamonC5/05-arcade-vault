# SPEC 05 — Asteroides: juego real portado a Next.js

> **Estado:** Implementado · **Depende de:** SPEC 01 (HUD, pausa y modal de fin
> de partida reutilizados), SPEC 02 (convención de rutas bajo `/games`) ·
> **Fecha:** 2026-08-15
> **Objetivo:** Portar el juego de referencia Asteroides (Canvas 2D vanilla
> en `references/started-games/02-asteroids`) a un componente cliente de
> Next.js, publicado como juego nuevo y jugable en `/games/asteroides/play`,
> reutilizando el HUD, la pausa y el modal de fin de partida ya existentes
> en la plataforma.

---

## Scope

**In:**

- Nueva entrada en `app/data/games.ts`: `id: 'asteroides'`, `title:
'ASTEROIDES'` — 7º juego del catálogo (ver Data model).
- Nueva clase de portada CSS `.cover-asteroides` en `app/globals.css`,
  siguiendo el patrón procedural existente (gradiente + pseudo-elementos),
  como el resto de `.cover-*`.
- Puerto completo de la jugabilidad de
  `references/started-games/02-asteroids/game.js` a
  `components/games/AsteroidsGame.tsx` (`"use client"`): nave, rotación e
  impulso, disparo, asteroides que se dividen (grande → mediano → pequeño),
  wraparound toroidal en los bordes, partículas de explosión, power-up de
  disparo triple, vidas, niveles progresivos, invencibilidad temporal tras
  morir.
- Nueva ruta estática `app/games/asteroides/play/page.tsx`: mismo layout que
  `app/games/[id]/play/page.tsx` (HUD, botones PAUSA/FIN/SALIR, modal de fin
  de partida), pero alimentado con el estado real del motor portado en vez
  del incremento de puntuación falso por `setInterval`.
- El motor expone hacia React `score`, `lives`, `level` y el estado
  (`playing`/`dead`/`gameover`) para que el HUD y el modal reaccionen.
- Se elimina/oculta el HUD, la pausa y el texto "GAME OVER" que el canvas
  original dibuja por sí mismo — evita UI duplicada.
- Controles idénticos al original: flechas izquierda/derecha para rotar,
  flecha arriba para impulso, espacio para disparar. El botón "PAUSA" ya
  existente en el HUD de React congela el bucle del motor; no se añade
  atajo de teclado nuevo para pausar.
- El botón "SALIR" ya existente, al desmontar el componente, detiene el
  motor: cancela el `requestAnimationFrame` y quita los listeners de
  teclado.
- Canvas de resolución interna fija 800×600, escalado por CSS al 100% del
  contenedor `.crt-screen` (que ya tiene `aspect-ratio: 4/3`, la misma
  proporción que el original).

**Fuera de alcance (para futuras specs):**

- El juego "ROCAS" existente (`id: 'rocas'`) no se toca — sigue siendo el
  placeholder visual mock de la spec 01. Es un juego distinto de Asteroides.
- Persistencia real de la puntuación (ni localStorage ni Supabase). El
  botón "GUARDAR PUNTUACIÓN" del modal sigue siendo un no-op (solo cambia
  el estado local `saved`), igual que hoy para el resto de juegos. Decisión
  explícita del usuario para esta spec. Depende de una spec futura de Hall
  of Fame/Supabase (continuación de la spec 04).
- Actualizar el campo `best` (mejor puntuación global) de
  `app/data/games.ts` con datos reales de partidas jugadas.
- Controles táctiles/móviles — solo teclado, igual que el original.
- Un patrón/interfaz genérica formal para "cómo se integra un juego real en
  la plataforma" — se resuelve solo para Asteroides; el layout de archivos
  elegido aquí sienta precedente pero no se documenta como sistema.
- Escalado del canvas por `devicePixelRatio` — mejora visual futura si hace
  falta.
- Cambiar el idioma de ningún texto — todo permanece en español.

---

## Data model

```ts
// app/data/games.ts — nueva entrada añadida al array GAMES
{
  id: 'asteroides',
  title: 'ASTEROIDES',
  short: 'Dispara y sobrevive entre rocas espaciales a la deriva.',
  long: 'Pilota una nave triangular en el vacío absoluto. Rota, impulsa y dispara para fragmentar asteroides en pedazos cada vez más pequeños, mientras esquivas colisiones y persigues el power-up de disparo triple antes de que expire. Cada oleada añade más rocas al vacío.',
  cat: 'SHOOTER',
  cover: 'cover-asteroides',
  color: 'cyan',
  best: 0,
  plays: '0',
}
```

`best`/`plays` arrancan en `0` en vez de una cifra "de sabor" ficticia,
porque es un juego recién incorporado y todavía no hay persistencia real
(ver "Fuera de alcance"). `color: 'cyan'` lo diferencia visualmente de
`rocas` (`yellow`) en las tarjetas del catálogo. Estos valores y los textos
`short`/`long` son un borrador razonable, no una decisión cerrada — ver
"Decisions".

Estado interno del motor (dentro de `AsteroidsGame.tsx`, portado de
`game.js`):

```ts
// Mismo modelo que el original, pero encapsulado en el componente
// (no como variables globales de módulo) para evitar fugas de estado
// entre montajes/desmontajes de React.
let ship: Ship;
let bullets: Bullet[] = [];
let asteroids: Asteroid[] = [];
let particles: Particle[] = [];
let powerUps: PowerUp[] = [];
let score = 0;
let lives = 3;
let level = 1;
let state: "playing" | "dead" | "gameover" = "playing";
```

Puente hacia el HUD de React: cada vez que `score`, `lives`, `level` o
`state` cambian, el motor notifica al componente (p. ej. un callback
`onStateChange` pasado a la clase del motor) para que `AsteroidsGame`
actualice su propio `useState` y el HUD/modal se re-rendericen. La mecánica
exacta (callback vs. lectura periódica) se decide en implementación; el
contrato es: **el motor es la fuente de verdad, React solo refleja su
estado**.

---

## Implementation plan

1. **Añadir la ficha del juego.** Añadir la entrada `asteroides` a
   `app/data/games.ts` (valores del Data model) y la clase `.cover-asteroides`
   a `app/globals.css`.
   Verificación: `/games` muestra la tarjeta "ASTEROIDES"; `/games/asteroides`
   (detalle, ruta dinámica ya existente) muestra su ficha; "JUGAR AHORA"
   lleva a `/games/asteroides/play`, que de momento sigue usando el
   placeholder genérico (aún no existe la ruta estática) — comportamiento
   correcto en este paso.

2. **Crear la pantalla de juego real (esqueleto).** Crear
   `app/games/asteroides/play/page.tsx` como copia inicial del HUD/pausa/modal
   de `app/games/[id]/play/page.tsx`, pero con un `<canvas>` vacío en vez de
   los `.enemy`/`.player-ship` CSS-animados, y sin el incremento de
   puntuación falso por `setInterval`.
   Verificación: Next.js resuelve la ruta estática sobre la dinámica —
   `/games/asteroides/play` renderiza el nuevo archivo (canvas negro vacío);
   `/games/rocas/play` y el resto siguen con el placeholder sin cambios.

3. **Portar el motor del juego.** Crear `components/games/AsteroidsGame.tsx`
   (`"use client"`) con el motor portado de
   `references/started-games/02-asteroids/game.js`: clases `Ship`,
   `Asteroid`, `Bullet`, `Particle`, `PowerUp`, bucle
   `requestAnimationFrame` con `dt` capado a 50ms, colisiones circulares,
   wraparound toroidal, spawn de niveles y power-up — encapsulado en un
   `useEffect`/`useRef` (sin variables globales de módulo), montado sobre el
   `<canvas>` del paso 2, sin HUD ni "GAME OVER" propios dibujados.
   Verificación: en `/games/asteroides/play` la nave aparece, responde a
   flechas/espacio, los asteroides se mueven y se pueden destruir — tan
   jugable como el original, aunque el HUD de React todavía no refleje el
   marcador real.

4. **Conectar el estado real al HUD y al modal.** Conectar `score`, `lives`,
   `level`, `state` del motor al `useState` de
   `app/games/asteroides/play/page.tsx`.
   Verificación: jugar hasta perder las 3 vidas abre el modal "FIN DEL
   JUEGO" con la puntuación real alcanzada; "JUGAR DE NUEVO" reinicia el
   motor desde cero.

5. **Conectar la pausa.** El botón "PAUSA" existente congela/reanuda el
   bucle del motor (deja de llamar a `update(dt)` mientras `paused === true`;
   `draw()` puede seguir pintando el último frame).
   Verificación: pulsar "PAUSA" detiene el movimiento de todos los
   elementos; "REANUDAR" lo continúa sin saltos ni pérdida de estado.

6. **Limpieza en desmontaje.** Cancelar el `requestAnimationFrame` y quitar
   los listeners de teclado (`keydown`/`keyup`) en el `return` del
   `useEffect`.
   Verificación: navegar a `/games/asteroides/play` y volver a `/games`
   repetidamente (o con React Strict Mode en desarrollo) no deja el bucle
   corriendo en segundo plano ni duplica los listeners.

7. **Verificación end-to-end.** Recorrer una partida completa: mover,
   rotar, impulsar, disparar; destruir asteroides grandes → medianos →
   pequeños con la puntuación correcta; recoger el power-up de disparo
   triple; pasar de nivel al limpiar todos los asteroides; perder las 3
   vidas y ver el modal de fin de partida; "JUGAR DE NUEVO" y "SALIR"
   funcionando.

---

## Acceptance criteria

- [x] `/games` muestra una tarjeta "ASTEROIDES" que enlaza a `/games/asteroides`.
- [x] `/games/asteroides` (detalle) muestra título, descripción y botón
      "JUGAR AHORA" que lleva a `/games/asteroides/play`.
- [x] `/games/asteroides/play` renderiza el juego real (canvas) en vez del
      placeholder CSS-animado.
- [x] Las flechas izquierda/derecha rotan la nave y la flecha arriba la
      impulsa, igual que en `references/started-games/02-asteroids`.
- [x] Espacio dispara balas que destruyen asteroides.
- [x] Un asteroide grande destruido se divide en dos medianos; un mediano en
      dos pequeños; un pequeño desaparece sin dividirse.
- [x] La puntuación del HUD aumenta 20/50/100 puntos según el tamaño de
      asteroide destruido (grande/mediano/pequeño), igual que el array
      `POINTS` original.
- [x] Todos los elementos (nave, asteroides, balas, power-up) reaparecen por
      el lado opuesto al cruzar un borde del canvas (wraparound).
- [x] Al chocar la nave con un asteroide se pierde una vida, mostrada en el
      HUD; tras perder las 3 vidas se abre el modal "FIN DEL JUEGO" con la
      puntuación final.
- [ ] Limpiar todos los asteroides de la pantalla avanza de nivel (el HUD
      muestra el nivel incrementado) y aparecen `3 + nivel` asteroides
      grandes nuevos. **Sin confirmación visual directa** — un playtest
      automatizado llegó al 95 % de la puntuación máxima posible de un nivel
      (1980/2080) sin llegar a vaciarlo del todo; el disparador
      (`if (asteroids.length === 0) nextLevel()`) y `nextLevel()` son un port
      literal de una línea contra el original, ya revisado. Pendiente de que
      alguien lo confirme jugando una partida completa.
- [x] El botón "PAUSA" detiene el movimiento de todos los elementos;
      "REANUDAR" lo continúa.
- [x] "JUGAR DE NUEVO" en el modal reinicia puntuación, vidas y nivel a sus
      valores iniciales.
- [x] "SALIR" navega a `/games/asteroides` sin errores en consola.
- [x] Salir de `/games/asteroides/play` y volver a entrar no dobla la
      velocidad del juego ni genera listeners de teclado duplicados.
- [x] `/games/rocas/play` y el resto de juegos siguen mostrando el
      placeholder sin cambios de comportamiento.

---

## Decisions

- **Sí:** ruta estática `app/games/asteroides/play/page.tsx` en vez de
  ramificar `app/games/[id]/play/page.tsx`. Next.js prioriza rutas
  estáticas sobre dinámicas para una coincidencia exacta; aísla el código
  del juego real sin tocar el placeholder de los demás juegos.
- **Sí:** se reutiliza el HUD/pausa/modal de React existentes en vez del
  HUD propio que dibuja `game.js` sobre el canvas. Mantiene consistencia
  visual (tipografía pixel, colores neón, modal de guardado) con el resto
  de la plataforma; el motor pasa a ser "headless" en cuanto a UI.
- **Sí:** un único componente cliente `components/games/AsteroidsGame.tsx`
  con el motor completo dentro, en vez de separar motor (`lib/`) y wrapper
  (`components/`). Port más directo y auditable línea a línea contra el
  original para este primer juego real; se puede refactorizar a capas
  separadas más adelante si un segundo juego real lo justifica.
- **Sí:** controles idénticos al original (flechas + espacio); pausa solo
  por botón de UI, sin atajo de teclado nuevo. Menor superficie de cambio
  respecto al original.
- **Sí:** canvas de resolución fija 800×600 escalado por CSS, sin ajuste
  por `devicePixelRatio`. Ya coincide con el `aspect-ratio: 4/3` de
  `.crt-screen`; HiDPI es una mejora visual, no funcional.
- **Sí (propuesta, ajustable):** `color: 'cyan'`, `best: 0`, `plays: '0'` y
  los textos `short`/`long` de la nueva ficha son un borrador inicial
  razonable — no fueron fijados explícitamente por el usuario y se pueden
  cambiar sin impacto en el resto del plan.
- **No:** persistencia real de puntuación (localStorage o Supabase). El
  botón "GUARDAR PUNTUACIÓN" sigue siendo un no-op, igual que en el resto
  de juegos hoy — decisión explícita del usuario (planteada y descartada
  también durante la definición de esta spec), coherente con las specs 01
  y 04.
- **No:** patrón/interfaz genérica formal para futuros juegos reales. Se
  resuelve solo para Asteroides — decisión explícita del usuario, para no
  sobre-diseñar antes de tener un segundo caso real.
- **No:** tocar el juego "ROCAS" existente. Es un juego distinto —
  aclaración explícita del usuario durante la definición de esta spec.
- **No:** controles táctiles/móviles. El original tampoco los tiene; fuera
  de alcance para este port inicial.

---

## Risks

| Riesgo                                                                                                                                             | Mitigación                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode (en desarrollo) monta/desmonta el efecto dos veces y puede duplicar el bucle `requestAnimationFrame` o los listeners de teclado. | Cancelar explícitamente el `requestAnimationFrame` y quitar los listeners en el cleanup del `useEffect` (paso 6 del plan); verificar en desarrollo que la puntuación no avanza al doble de velocidad. |
| El canvas fijo de 800×600 escalado por CSS puede verse borroso en pantallas de alta densidad (retina).                                             | Aceptado para este v1 (decisión explícita); una mejora futura puede añadir escalado por `devicePixelRatio` sin cambiar el resto del motor.                                                            |

---

## What is **not** in this spec

- El juego "ROCAS" no se toca.
- Persistencia real de puntuaciones (localStorage/Supabase) — el botón
  "GUARDAR PUNTUACIÓN" sigue sin hacer nada.
- Actualizar `best` con datos reales de partidas jugadas.
- Controles táctiles/móviles.
- Un patrón/interfaz genérico para integrar futuros juegos reales.
- Escalado del canvas por `devicePixelRatio`.

Cada uno de estos, si se aborda, va en su propia spec futura.
