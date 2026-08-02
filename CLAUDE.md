# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Arcade Vault (Spanish copy) — a platform to play arcade games online and compete for high scores. The project is a freshly scaffolded Next.js 16 / React 19 / Tailwind v4 app (App Router). At this stage `app/` still contains the default `create-next-app` boilerplate (`app/page.tsx`, `app/layout.tsx`) — real screens have not been built yet.

## ⚠️ Next.js version warning

This project pins `next@16.2.12`, which is newer than most training data. **Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`** — APIs, conventions, and file structure may differ from what you expect. Heed any deprecation notices found there. (See `AGENTS.md`.)

## Commands

```bash
npm run dev      # start dev server (Next.js, Turbopack default)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured in `package.json` yet.

## Spec-driven workflow

This repo follows a **spec-driven development** process (see `AGENTS.md`, based on https://github.com/Klerith/fernando-skills). Two custom skills drive it, defined in `.claude/skills/`:

- **`/spec`** (`.claude/skills/spec/SKILL.md`) — guided, multi-phase spec design session. Asks clarifying questions, then builds a spec section-by-section with user confirmation at each step. Never writes code. Saves the result to `specs/NN-slug.md` (directory doesn't exist yet — it's created on first use) using the structure in `.claude/skills/spec/template.md`. New specs start in `Draft` state.
- **`/spec-impl NN-slug`** (`.claude/skills/spec-impl/SKILL.md`) — implements a spec, but **only if its status is `Approved`** (or an equivalent word in another language — status is language-agnostic). Creates/switches to a branch named `spec-NN-slug` (controlled by `AutoCreateBranch` in `specs/.spec-config.yml`, default `true`), then implements the plan one step at a time, pausing for diff review after each step.

**Practical implication:** if asked to build a feature, check whether an approved spec exists in `specs/` first. For anything non-trivial, prefer routing through `/spec` before writing code rather than improvising the design — that's the whole point of this repo's workflow. Don't mark a spec `Approved` yourself; that transition is manual, made by the human.

## Design reference

`references/templates/` contains an **HTML/JSX prototype** (plain global-script React, not part of the Next.js build) that mocks up the intended UI/UX and mock data. Treat it as a visual and structural reference when implementing specs, not as code to import directly — it needs to be reimplemented as proper App Router components/routes:

- `Arcade Vault.html` — standalone prototype shell
- `app.jsx` — prototype router/state (hash-based routing, `localStorage` for user/session and score persistence)
- `nav.jsx` — top navigation
- `biblioteca.jsx` — game library/browse screen (filters by category)
- `detalle.jsx` — game detail screen
- `reproductor.jsx` — the in-game player screen
- `salon.jsx` — hall of fame / leaderboard screen
- `auth.jsx` — sign-in screen
- `data.jsx` — mock data: `GAMES` (id, title, category, cover, color, best score, plays), `CATS` (category filters), `PLAYERS` + `seededScores()` for mock leaderboard rows
- `styles.css` — prototype visual language (neon/pixel arcade aesthetic)

The mock data model in `data.jsx` (games list, categories, leaderboard entries) is the de facto starting point for the real data model — expect specs to formalize it.

## Path alias

`@/*` maps to the repo root (see `tsconfig.json`), not to `src/` — there is no `src/` directory.
